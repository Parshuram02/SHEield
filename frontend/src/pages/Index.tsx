import React, { useState } from 'react';
import { Shield, MapPin, Phone, Activity, AlertTriangle, Users, Volume2, Navigation, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AudioMonitor from '@/components/AudioMonitor';
import EmergencyContacts from '@/components/EmergencyContacts';
import AlertHistory from '@/components/AlertHistory';
import SafetyStatus from '@/components/SafetyStatus';
import KeywordDetector from '@/components/KeywordDetector';
import SafePlaces from '@/components/SafePlaces';
import EmergencyPrompt from '@/components/EmergencyPrompt';

const Index = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [activeTab, setActiveTab] = useState('monitor');
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [sirenEnabled, setSirenEnabled] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const tabs = [
    { id: 'monitor', label: 'Monitor', icon: Activity },
    { id: 'keywords', label: 'Keywords', icon: Volume2 },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'history', label: 'History', icon: AlertTriangle },
    { id: 'places', label: 'Safe Places', icon: Navigation },
    { id: 'alerts', label: 'Alerts', icon: Zap },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'monitor':
        return <AudioMonitor isMonitoring={isMonitoring} setIsMonitoring={setIsMonitoring} />;
      case 'keywords':
        return <KeywordDetector 
          onKeywordDetected={(keyword, confidence, transcription) => {
            console.log(`🚨 Emergency keyword detected: ${keyword} (${(confidence * 100).toFixed(1)}%)`);
            // TODO: Integrate with emergency system
          }}
          isEnabled={true}
        />;
      case 'contacts':
        return <EmergencyContacts />;
      case 'history':
        return <AlertHistory />;
      case 'places':
        return <SafePlaces 
          onLocationSelect={(place) => {
            console.log(`📍 Selected safe place: ${place.name}`);
            // TODO: Integrate with emergency system
          }}
          emergencyMode={isMonitoring}
        />;
      case 'alerts':
        return <EmergencyPrompt 
          isActive={emergencyActive}
          onSirenToggle={setSirenEnabled}
          onFlashToggle={setFlashEnabled}
          onVolumeChange={(volume) => console.log('Volume changed:', volume)}
          onFlashRateChange={(rate) => console.log('Flash rate changed:', rate)}
          onEmergencyActivate={() => setEmergencyActive(true)}
          onEmergencyDeactivate={() => setEmergencyActive(false)}
        />;
      default:
        return <AudioMonitor isMonitoring={isMonitoring} setIsMonitoring={setIsMonitoring} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Sentinel</h1>
                <p className="text-xs text-muted-foreground">Women Safety Guardian</p>
              </div>
            </div>
            <SafetyStatus isActive={isMonitoring} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-around py-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Emergency Button - Always Visible */}
      <div className="fixed bottom-20 right-4">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-gradient-danger text-white shadow-danger animate-pulse-danger"
        >
          <Phone className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default Index;
