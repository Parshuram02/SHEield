import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MapPin, Volume2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AudioMonitorProps {
  isMonitoring: boolean;
  setIsMonitoring: (monitoring: boolean) => void;
}

interface AudioAnalysis {
  level: number;
  energy: number;
  zeroCrossingRate: number;
  spectralCentroid: number;
  isVoice: boolean;
  dangerScore: number;
}

const AudioMonitor: React.FC<AudioMonitorProps> = ({ isMonitoring, setIsMonitoring }) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [location, setLocation] = useState('Getting location...');
  const [anomalyScore, setAnomalyScore] = useState(15);
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis>({
    level: 0,
    energy: 0,
    zeroCrossingRate: 0,
    spectralCentroid: 0,
    isVoice: false,
    dangerScore: 0
  });
  const [dangerDetected, setDangerDetected] = useState(false);

  // Refs for MediaRecorder, WebSocket, and audio analysis
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const frameCountRef = useRef(0);

  // VAD parameters
  const VAD_THRESHOLD = 0.1;
  const DANGER_THRESHOLD = 0.7;
  const BUFFER_SIZE = 4096;
  const SAMPLE_RATE = 44100;

  // Audio analysis functions
  const calculateEnergy = (buffer: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  };

  const calculateZeroCrossingRate = (buffer: Float32Array): number => {
    let crossings = 0;
    for (let i = 1; i < buffer.length; i++) {
      if ((buffer[i] >= 0) !== (buffer[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / buffer.length;
  };

  const calculateSpectralCentroid = (buffer: Float32Array): number => {
    // Simplified spectral centroid calculation
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < buffer.length / 2; i++) {
      const magnitude = Math.abs(buffer[i]);
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  };

  const detectDangerousSound = (analysis: AudioAnalysis): boolean => {
    // Heuristic-based danger detection
    const highEnergy = analysis.energy > 0.3;
    const highPitch = analysis.spectralCentroid > 0.6;
    const voiceLike = analysis.zeroCrossingRate > 0.1 && analysis.zeroCrossingRate < 0.3;
    
    // Detect potential screams, crashes, or loud impacts
    if (highEnergy && (highPitch || voiceLike)) {
      return true;
    }
    
    return false;
  };

  const processAudioBuffer = (buffer: Float32Array) => {
    const energy = calculateEnergy(buffer);
    const zeroCrossingRate = calculateZeroCrossingRate(buffer);
    const spectralCentroid = calculateSpectralCentroid(buffer);
    const isVoice = energy > VAD_THRESHOLD && zeroCrossingRate > 0.05 && zeroCrossingRate < 0.4;
    
    const newAnalysis: AudioAnalysis = {
      level: Math.min(100, energy * 100),
      energy,
      zeroCrossingRate,
      spectralCentroid,
      isVoice,
      dangerScore: 0
    };

    // Calculate danger score based on multiple factors
    let dangerScore = 0;
    if (energy > 0.2) dangerScore += 0.3;
    if (highPitch) dangerScore += 0.2;
    if (isVoice && energy > 0.4) dangerScore += 0.3;
    if (energy > 0.6) dangerScore += 0.2;
    
    newAnalysis.dangerScore = Math.min(1, dangerScore);
    
    setAudioAnalysis(newAnalysis);
    setAudioLevel(newAnalysis.level);
    
    // Check if dangerous sound detected
    const isDangerous = detectDangerousSound(newAnalysis);
    if (isDangerous && !dangerDetected) {
      setDangerDetected(true);
      // Send alert to backend immediately
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'danger_alert',
          analysis: newAnalysis,
          timestamp: Date.now()
        }));
      }
    } else if (!isDangerous) {
      setDangerDetected(false);
    }
  };

  useEffect(() => {
    if (isMonitoring) {
      // Initialize audio context and analyzer
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      // Create script processor for real-time analysis
      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(BUFFER_SIZE, 1, 1);
      
      scriptProcessorRef.current.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Process audio in real-time
        processAudioBuffer(inputData);
        
        // Buffer audio for potential upload
        audioBufferRef.current.push([...inputData]);
        frameCountRef.current++;
        
        // Keep only last 5 seconds of audio (at 44.1kHz)
        const maxFrames = Math.floor(5 * SAMPLE_RATE / BUFFER_SIZE);
        if (audioBufferRef.current.length > maxFrames) {
          audioBufferRef.current.shift();
        }
      };
      
      // Connect audio nodes
      if (microphoneRef.current && analyserRef.current && scriptProcessorRef.current) {
        microphoneRef.current.connect(analyserRef.current);
        analyserRef.current.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(audioContextRef.current.destination);
      }
    } else {
      // Cleanup audio context
      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      audioBufferRef.current = [];
      frameCountRef.current = 0;
    }
  }, [isMonitoring]);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        },
        () => {
          setLocation('Location unavailable');
        }
      );
    }
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startRecording() {
      try {
        wsRef.current = new WebSocket('ws://localhost:8000/audio');

        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: SAMPLE_RATE
          } 
        });
        
        // Create audio source for analysis
        if (audioContextRef.current) {
          microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
        }

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
            // Only send audio if VAD detects activity or danger
            if (audioAnalysis.isVoice || audioAnalysis.dangerScore > 0.5) {
              wsRef.current.send(event.data);
            }
          }
        };

        mediaRecorder.start(1000); // 1 second per chunk for faster response
      } catch (err) {
        console.error('Audio recording error:', err);
      }
    }

    function stopRecording() {
      mediaRecorderRef.current?.stop();
      stream?.getTracks().forEach(track => track.stop());
      wsRef.current?.close();
    }

    if (isMonitoring) {
      startRecording();
    } else {
      stopRecording();
    }

    return () => {
      stopRecording();
    };
  }, [isMonitoring, audioAnalysis.isVoice, audioAnalysis.dangerScore]);

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const getAnomalyStatus = () => {
    if (audioAnalysis.dangerScore < 0.3) return { label: 'Safe', color: 'bg-success', textColor: 'text-success' };
    if (audioAnalysis.dangerScore < 0.6) return { label: 'Caution', color: 'bg-warning', textColor: 'text-warning' };
    return { label: 'Alert', color: 'bg-destructive', textColor: 'text-destructive' };
  };

  const status = getAnomalyStatus();

  return (
    <div className="space-y-6">
      {/* Main Monitor Card */}
      <Card className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl text-foreground">Audio Guardian</CardTitle>
          <Badge variant={isMonitoring ? "default" : "secondary"} className="mx-auto">
            {isMonitoring ? 'Actively Monitoring' : 'Standby Mode'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Monitor Button */}
          <div className="flex justify-center">
            <Button
              onClick={toggleMonitoring}
              size="icon"
              className={`h-24 w-24 rounded-full transition-all duration-300 ${
                isMonitoring
                  ? 'bg-gradient-safe text-white shadow-glow animate-pulse-safe'
                  : 'bg-gradient-primary text-white hover:shadow-glow'
              }`}
            >
              {isMonitoring ? (
                <Mic className="h-8 w-8 animate-listening" />
              ) : (
                <MicOff className="h-8 w-8" />
              )}
            </Button>
          </div>

          {/* Danger Alert */}
          {dangerDetected && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Dangerous Sound Detected!</p>
                <p className="text-sm text-destructive/80">Analyzing and alerting emergency contacts...</p>
              </div>
            </div>
          )}

          {/* Status Information */}
          {isMonitoring && (
            <div className="space-y-4">
              {/* Audio Level */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Audio Level
                  </span>
                  <span className="text-sm font-medium">{audioAnalysis.level.toFixed(0)}%</span>
                </div>
                <Progress value={audioAnalysis.level} className="h-2" />
              </div>

              {/* VAD Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Voice Activity</span>
                  <Badge variant={audioAnalysis.isVoice ? "default" : "secondary"}>
                    {audioAnalysis.isVoice ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {/* Danger Detection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Danger Score</span>
                  <Badge className={`${status.color} text-white`}>
                    {status.label}
                  </Badge>
                </div>
                <Progress 
                  value={audioAnalysis.dangerScore * 100} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  Score: {(audioAnalysis.dangerScore * 100).toFixed(1)}%
                </div>
              </div>

              {/* Technical Details */}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Energy: {(audioAnalysis.energy * 100).toFixed(1)}%</div>
                <div>ZCR: {(audioAnalysis.zeroCrossingRate * 100).toFixed(1)}%</div>
                <div>Centroid: {(audioAnalysis.spectralCentroid * 100).toFixed(1)}%</div>
                <div>Frames: {frameCountRef.current}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Current Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground font-mono">{location}</p>
          <Button variant="outline" size="sm" className="mt-3">
            Share Location
          </Button>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {isMonitoring && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">0</div>
              <div className="text-xs text-muted-foreground">Alerts Today</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">24/7</div>
              <div className="text-xs text-muted-foreground">Protection</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AudioMonitor;