import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { 
    Volume2, 
    VolumeX, 
    Zap, 
    ZapOff, 
    AlertTriangle,
    CheckCircle,
    XCircle,
    Settings,
    Play,
    Pause,
    RotateCcw
} from 'lucide-react';

interface EmergencyPromptProps {
    isActive: boolean;
    onSirenToggle: (enabled: boolean) => void;
    onFlashToggle: (enabled: boolean) => void;
    onVolumeChange: (volume: number) => void;
    onFlashRateChange: (rate: number) => void;
    onEmergencyActivate: () => void;
    onEmergencyDeactivate: () => void;
}

const EmergencyPrompt: React.FC<EmergencyPromptProps> = ({
    isActive,
    onSirenToggle,
    onFlashToggle,
    onVolumeChange,
    onFlashRateChange,
    onEmergencyActivate,
    onEmergencyDeactivate
}) => {
    const [sirenEnabled, setSirenEnabled] = useState(false);
    const [flashEnabled, setFlashEnabled] = useState(false);
    const [sirenVolume, setSirenVolume] = useState(50);
    const [flashRate, setFlashRate] = useState(500);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);
    const [gainNode, setGainNode] = useState<GainNode | null>(null);
    const [flashInterval, setFlashInterval] = useState<NodeJS.Timeout | null>(null);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio context
    useEffect(() => {
        if (typeof window !== 'undefined' && window.AudioContext) {
            const context = new AudioContext();
            setAudioContext(context);
        }
    }, []);

    // Handle siren toggle
    const handleSirenToggle = (enabled: boolean) => {
        setSirenEnabled(enabled);
        onSirenToggle(enabled);
        
        if (enabled) {
            startSiren();
        } else {
            stopSiren();
        }
    };

    // Handle flash toggle
    const handleFlashToggle = (enabled: boolean) => {
        setFlashEnabled(enabled);
        onFlashToggle(enabled);
        
        if (enabled) {
            startFlash();
        } else {
            stopFlash();
        }
    };

    // Start siren sound
    const startSiren = () => {
        if (!audioContext) {
            setError('Audio context not available');
            return;
        }

        try {
            // Create oscillator for siren sound
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.5);
            osc.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 1);
            
            gain.gain.setValueAtTime(0, audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(sirenVolume / 100, audioContext.currentTime + 0.1);
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.start();
            osc.stop(audioContext.currentTime + 1);
            
            setOscillator(osc);
            setGainNode(gain);
            setIsPlaying(true);
            
            // Loop the siren
            const loopSiren = () => {
                if (sirenEnabled && audioContext) {
                    const newOsc = audioContext.createOscillator();
                    const newGain = audioContext.createGain();
                    
                    newOsc.type = 'sine';
                    newOsc.frequency.setValueAtTime(800, audioContext.currentTime);
                    newOsc.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.5);
                    newOsc.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 1);
                    
                    newGain.gain.setValueAtTime(0, audioContext.currentTime);
                    newGain.gain.linearRampToValueAtTime(sirenVolume / 100, audioContext.currentTime + 0.1);
                    
                    newOsc.connect(newGain);
                    newGain.connect(audioContext.destination);
                    
                    newOsc.start();
                    newOsc.stop(audioContext.currentTime + 1);
                    
                    setOscillator(newOsc);
                    setGainNode(newGain);
                    
                    setTimeout(loopSiren, 1000);
                }
            };
            
            setTimeout(loopSiren, 1000);
            
        } catch (err) {
            console.error('Error starting siren:', err);
            setError('Failed to start siren sound');
        }
    };

    // Stop siren sound
    const stopSiren = () => {
        if (oscillator) {
            try {
                oscillator.stop();
            } catch (err) {
                // Oscillator might already be stopped
            }
        }
        if (gainNode) {
            try {
                gainNode.gain.setValueAtTime(0, audioContext?.currentTime || 0);
            } catch (err) {
                // Gain node might be disconnected
            }
        }
        setOscillator(null);
        setGainNode(null);
        setIsPlaying(false);
    };

    // Start screen flash
    const startFlash = () => {
        const interval = setInterval(() => {
            // Create a flash effect by temporarily changing background
            const originalBackground = document.body.style.backgroundColor;
            document.body.style.backgroundColor = '#ff0000';
            document.body.style.transition = 'background-color 0.1s';
            
            setTimeout(() => {
                document.body.style.backgroundColor = originalBackground;
            }, 100);
        }, flashRate);
        
        setFlashInterval(interval);
    };

    // Stop screen flash
    const stopFlash = () => {
        if (flashInterval) {
            clearInterval(flashInterval);
            setFlashInterval(null);
        }
        // Reset body background
        document.body.style.backgroundColor = '';
        document.body.style.transition = '';
    };

    // Handle volume change
    const handleVolumeChange = (value: number[]) => {
        const volume = value[0];
        setSirenVolume(volume);
        onVolumeChange(volume);
        
        if (gainNode && audioContext) {
            gainNode.gain.setValueAtTime(volume / 100, audioContext.currentTime);
        }
    };

    // Handle flash rate change
    const handleFlashRateChange = (value: number[]) => {
        const rate = value[0];
        setFlashRate(rate);
        onFlashRateChange(rate);
        
        if (flashEnabled) {
            stopFlash();
            startFlash();
        }
    };

    // Test siren sound
    const testSiren = () => {
        if (sirenEnabled) {
            stopSiren();
            setTimeout(() => startSiren(), 100);
        } else {
            handleSirenToggle(true);
            setTimeout(() => handleSirenToggle(false), 2000);
        }
    };

    // Test flash
    const testFlash = () => {
        if (flashEnabled) {
            stopFlash();
            setTimeout(() => startFlash(), 100);
        } else {
            handleFlashToggle(true);
            setTimeout(() => handleFlashToggle(false), 2000);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSiren();
            stopFlash();
        };
    }, []);

    // Stop everything when emergency is deactivated
    useEffect(() => {
        if (!isActive) {
            stopSiren();
            stopFlash();
            setSirenEnabled(false);
            setFlashEnabled(false);
        }
    }, [isActive]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Emergency Alerts
                    </h1>
                    <p className="text-gray-600">
                        Configure siren sounds and screen flash for emergency situations
                    </p>
                </div>
                {isActive && (
                    <Badge variant="destructive" className="text-sm">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Active
                    </Badge>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Emergency Controls */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <span>Emergency Controls</span>
                    </CardTitle>
                    <CardDescription>
                        Activate or deactivate emergency alert system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Emergency Alert System</h3>
                            <p className="text-sm text-gray-600">
                                {isActive ? 'System is active and ready' : 'System is inactive'}
                            </p>
                        </div>
                        <Button
                            onClick={isActive ? onEmergencyDeactivate : onEmergencyActivate}
                            variant={isActive ? "destructive" : "default"}
                            size="lg"
                        >
                            {isActive ? (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Deactivate
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Activate
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Siren Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Volume2 className="w-5 h-5 text-blue-500" />
                        <span>Siren Sound</span>
                    </CardTitle>
                    <CardDescription>
                        Configure emergency siren sound settings
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="siren-toggle">Enable Siren</Label>
                            <p className="text-sm text-gray-600">
                                Play emergency siren sound during alerts
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="siren-toggle"
                                checked={sirenEnabled}
                                onCheckedChange={handleSirenToggle}
                                disabled={!isActive}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={testSiren}
                                disabled={!isActive}
                            >
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>

                    {sirenEnabled && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <Label htmlFor="siren-volume">Volume: {sirenVolume}%</Label>
                                <Slider
                                    id="siren-volume"
                                    value={[sirenVolume]}
                                    onValueChange={handleVolumeChange}
                                    max={100}
                                    min={0}
                                    step={5}
                                    className="w-full"
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Flash Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        <span>Screen Flash</span>
                    </CardTitle>
                    <CardDescription>
                        Configure screen flash alert settings
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label htmlFor="flash-toggle">Enable Flash</Label>
                            <p className="text-sm text-gray-600">
                                Flash screen red during emergency alerts
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="flash-toggle"
                                checked={flashEnabled}
                                onCheckedChange={handleFlashToggle}
                                disabled={!isActive}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={testFlash}
                                disabled={!isActive}
                            >
                                <Zap className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {flashEnabled && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <Label htmlFor="flash-rate">Flash Rate: {flashRate}ms</Label>
                                <Slider
                                    id="flash-rate"
                                    value={[flashRate]}
                                    onValueChange={handleFlashRateChange}
                                    max={2000}
                                    min={200}
                                    step={100}
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-500">
                                    Lower values = faster flashing
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Status Display */}
            <Card>
                <CardHeader>
                    <CardTitle>System Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="text-sm">
                                System: {isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${sirenEnabled ? 'bg-blue-500' : 'bg-gray-400'}`} />
                            <span className="text-sm">
                                Siren: {sirenEnabled ? 'On' : 'Off'}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${flashEnabled ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                            <span className="text-sm">
                                Flash: {flashEnabled ? 'On' : 'Off'}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Safety Notice */}
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    <strong>Safety Notice:</strong> These alerts are designed for emergency situations only. 
                    Please use responsibly and ensure they don't interfere with your ability to call for help 
                    or navigate to safety. The siren sound may be loud - adjust volume accordingly.
                </AlertDescription>
            </Alert>
        </div>
    );
};

export default EmergencyPrompt;





