
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MapPin, Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AudioMonitorProps {
  isMonitoring: boolean;
  setIsMonitoring: (monitoring: boolean) => void;
}

const AudioMonitor: React.FC<AudioMonitorProps> = ({ isMonitoring, setIsMonitoring }) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [location, setLocation] = useState('Getting location...');
  const [anomalyScore, setAnomalyScore] = useState(15);

  // Refs for MediaRecorder and WebSocket
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (isMonitoring) {
      // Simulate audio level changes
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
        setAnomalyScore(Math.random() * 30 + 10);
      }, 500);
      return () => clearInterval(interval);
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
        wsRef.current = new WebSocket('ws://localhost:8000/audio'); // Change to your backend WebSocket URL

        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(event.data);
          }
        };

        mediaRecorder.start(10000); // 10 seconds per chunk
      } catch (err) {
        // Handle error (permissions, connection, etc.)
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
  }, [isMonitoring]);

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const getAnomalyStatus = () => {
    if (anomalyScore < 20) return { label: 'Safe', color: 'bg-success', textColor: 'text-success' };
    if (anomalyScore < 40) return { label: 'Caution', color: 'bg-warning', textColor: 'text-warning' };
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
                  <span className="text-sm font-medium">{audioLevel.toFixed(0)}%</span>
                </div>
                <Progress value={audioLevel} className="h-2" />
              </div>

              {/* Anomaly Detection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Safety Score</span>
                  <Badge className={`${status.color} text-white`}>
                    {status.label}
                  </Badge>
                </div>
                <Progress 
                  value={100 - anomalyScore} 
                  className="h-2"
                />
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