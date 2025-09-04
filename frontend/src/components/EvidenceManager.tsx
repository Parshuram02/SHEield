import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { 
    Download, 
    Share2, 
    Eye, 
    Edit, 
    Trash2, 
    Calendar, 
    MapPin, 
    Volume2, 
    FileText,
    BarChart3,
    Clock,
    Shield,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw
} from 'lucide-react';

interface AudioFile {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    duration: number;
    uploadPath: string;
    cloudUrl: string | null;
    signedUrl: string;
    expiresAt: string;
}

interface Location {
    lat: number;
    lng: number;
    accuracyMeters: number;
    source: string;
    address?: string;
    timestamp: string;
}

interface Classification {
    primary: string;
    secondary: string[];
    model: string;
    version: string;
    processingTime: number;
}

interface Meta {
    transcription: string;
    detectedKeywords: string[];
    audioQuality: string;
    backgroundNoise: string;
    userNotes: string;
    tags: string[];
    priority: string;
}

interface Evidence {
    shareToken: string;
    shareExpiresAt: string;
    isPublic: boolean;
    accessCount: number;
    lastAccessedAt: string | null;
}

interface AuditEntry {
    action: string;
    timestamp: string;
    userId: string;
    details: string;
    ipAddress: string;
    userAgent: string;
}

interface AlertEvent {
    _id: string;
    userId: string;
    type: string;
    confidence: number;
    trigger: {
        source: string;
        model: string;
        keyword: string;
        timestamp: string;
        confidence: number;
    };
    location: Location;
    device: {
        platform: string;
        userAgent: string;
        appVersion: string;
        deviceId: string;
        networkType: string;
    };
    audioFiles: AudioFile[];
    classification: Classification;
    actions: {
        smsSent: boolean;
        siren: boolean;
        flash: boolean;
        policeCalled: boolean;
        emergencyServices: boolean;
        userNotified: boolean;
    };
    recipients: any[];
    meta: Meta;
    evidence: Evidence;
    audit: AuditEntry[];
    occurredAt: string;
    createdAt: string;
    updatedAt: string;
}

interface EvidenceStats {
    totalEvents: number;
    totalAudioFiles: number;
    totalSize: number;
    avgConfidence: number;
    byType: Array<{ type: string; confidence: number }>;
}

const EvidenceManager: React.FC = () => {
    const [evidence, setEvidence] = useState<AlertEvent[]>([]);
    const [stats, setStats] = useState<EvidenceStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedEvidence, setSelectedEvidence] = useState<AlertEvent | null>(null);
    const [editingNotes, setEditingNotes] = useState('');
    const [shareUrl, setShareUrl] = useState('');
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchEvidence();
        fetchStats();
    }, []);

    const fetchEvidence = async () => {
        try {
            setLoading(true);
            // This would be replaced with actual API call
            const response = await fetch('/api/evidence');
            const data = await response.json();
            setEvidence(data.evidence || []);
        } catch (error) {
            console.error('Error fetching evidence:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/evidence/stats');
            const data = await response.json();
            setStats(data.stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString();
    };

    const getPriorityColor = (priority: string): string => {
        switch (priority) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'scream': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case 'crash': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
            case 'keyword': return <FileText className="w-4 h-4 text-blue-500" />;
            case 'manual': return <Shield className="w-4 h-4 text-purple-500" />;
            default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
        }
    };

    const handleShare = (evidence: AlertEvent) => {
        const shareUrl = `${window.location.origin}/evidence/${evidence.evidence.shareToken}`;
        setShareUrl(shareUrl);
        navigator.clipboard.writeText(shareUrl);
    };

    const handleDownload = async (alertId: string, filename: string) => {
        try {
            const response = await fetch(`/api/evidence/${alertId}/audio/${filename}`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading file:', error);
        }
    };

    const handleUpdateNotes = async (evidenceId: string, notes: string) => {
        try {
            const response = await fetch(`/api/evidence/${evidenceId}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 'meta.userNotes': notes })
            });
            
            if (response.ok) {
                setEditingNotes('');
                fetchEvidence(); // Refresh the list
            }
        } catch (error) {
            console.error('Error updating notes:', error);
        }
    };

    const filteredEvidence = evidence.filter(item => {
        const matchesFilter = filter === 'all' || item.type === filter;
        const matchesSearch = searchTerm === '' || 
            item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.meta.userNotes.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.meta.detectedKeywords.some(keyword => 
                keyword.toLowerCase().includes(searchTerm.toLowerCase())
            );
        return matchesFilter && matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Evidence Manager</h1>
                    <p className="text-gray-600">Manage and review emergency alerts and evidence</p>
                </div>
                <Button onClick={fetchEvidence} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalEvents}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Audio Files</CardTitle>
                            <Volume2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalAudioFiles}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(1)}%</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters and Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Label htmlFor="search">Search Evidence</Label>
                            <Input
                                id="search"
                                placeholder="Search by type, notes, or keywords..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="filter">Filter by Type</Label>
                            <Select value={filter} onValueChange={setFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="scream">Scream</SelectItem>
                                    <SelectItem value="crash">Crash</SelectItem>
                                    <SelectItem value="keyword">Keyword</SelectItem>
                                    <SelectItem value="manual">Manual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Evidence List */}
            <Tabs defaultValue="list" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="list">Evidence List</TabsTrigger>
                    <TabsTrigger value="details">Details View</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4">
                    {filteredEvidence.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-center text-gray-500">
                                No evidence found matching your criteria.
                            </CardContent>
                        </Card>
                    ) : (
                        filteredEvidence.map((item) => (
                            <Card key={item._id} className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-4 flex-1">
                                            <div className="flex-shrink-0">
                                                {getTypeIcon(item.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                                                        {item.type} Alert
                                                    </h3>
                                                    <Badge variant="outline" className={getPriorityColor(item.meta.priority)}>
                                                        {item.meta.priority}
                                                    </Badge>
                                                    <Badge variant="secondary">
                                                        {(item.confidence * 100).toFixed(0)}% confidence
                                                    </Badge>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{formatDate(item.occurredAt)}</span>
                                                    </div>
                                                    {item.location && (
                                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                            <MapPin className="w-4 h-4" />
                                                            <span>{item.location.address || `${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}`}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                        <Volume2 className="w-4 h-4" />
                                                        <span>{item.audioFiles.length} audio file(s)</span>
                                                    </div>
                                                </div>

                                                {item.meta.userNotes && (
                                                    <p className="text-gray-700 mb-3">{item.meta.userNotes}</p>
                                                )}

                                                {item.meta.detectedKeywords.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {item.meta.detectedKeywords.map((keyword, index) => (
                                                            <Badge key={index} variant="outline" className="text-xs">
                                                                {keyword}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col space-y-2 ml-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedEvidence(item)}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                View
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleShare(item)}
                                            >
                                                <Share2 className="w-4 h-4 mr-2" />
                                                Share
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                    {selectedEvidence ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    {getTypeIcon(selectedEvidence.type)}
                                    <span>Evidence Details</span>
                                </CardTitle>
                                <CardDescription>
                                    Comprehensive information about this emergency alert
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Basic Information */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Type</Label>
                                            <p className="text-sm text-gray-600 capitalize">{selectedEvidence.type}</p>
                                        </div>
                                        <div>
                                            <Label>Confidence</Label>
                                            <p className="text-sm text-gray-600">{(selectedEvidence.confidence * 100).toFixed(1)}%</p>
                                        </div>
                                        <div>
                                            <Label>Occurred At</Label>
                                            <p className="text-sm text-gray-600">{formatDate(selectedEvidence.occurredAt)}</p>
                                        </div>
                                        <div>
                                            <Label>Priority</Label>
                                            <Badge className={getPriorityColor(selectedEvidence.meta.priority)}>
                                                {selectedEvidence.meta.priority}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Location Information */}
                                {selectedEvidence.location && (
                                    <>
                                        <div>
                                            <h3 className="text-lg font-semibold mb-3">Location</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Coordinates</Label>
                                                    <p className="text-sm text-gray-600">
                                                        {selectedEvidence.location.lat.toFixed(6)}, {selectedEvidence.location.lng.toFixed(6)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <Label>Accuracy</Label>
                                                    <p className="text-sm text-gray-600">{selectedEvidence.location.accuracyMeters}m</p>
                                                </div>
                                                {selectedEvidence.location.address && (
                                                    <div className="md:col-span-2">
                                                        <Label>Address</Label>
                                                        <p className="text-sm text-gray-600">{selectedEvidence.location.address}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Audio Files */}
                                {selectedEvidence.audioFiles.length > 0 && (
                                    <>
                                        <div>
                                            <h3 className="text-lg font-semibold mb-3">Audio Evidence</h3>
                                            <div className="space-y-3">
                                                {selectedEvidence.audioFiles.map((file, index) => (
                                                    <div key={index} className="border rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div>
                                                                <p className="font-medium">{file.originalName || file.filename}</p>
                                                                <p className="text-sm text-gray-600">
                                                                    {formatFileSize(file.size)} • {file.duration}s
                                                                </p>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDownload(selectedEvidence._id, file.filename)}
                                                            >
                                                                <Download className="w-4 h-4 mr-2" />
                                                                Download
                                                            </Button>
                                                        </div>
                                                        <audio controls className="w-full">
                                                            <source src={`/api/evidence/${selectedEvidence._id}/audio/${file.filename}`} type="audio/webm" />
                                                            Your browser does not support the audio element.
                                                        </audio>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Classification */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Classification</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Primary Classification</Label>
                                            <p className="text-sm text-gray-600">{selectedEvidence.classification.primary}</p>
                                        </div>
                                        <div>
                                            <Label>Model</Label>
                                            <p className="text-sm text-gray-600">{selectedEvidence.classification.model}</p>
                                        </div>
                                        <div>
                                            <Label>Processing Time</Label>
                                            <p className="text-sm text-gray-600">{selectedEvidence.classification.processingTime}ms</p>
                                        </div>
                                        <div>
                                            <Label>Version</Label>
                                            <p className="text-sm text-gray-600">{selectedEvidence.classification.version}</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Actions Taken */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Actions Taken</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {Object.entries(selectedEvidence.actions).map(([action, taken]) => (
                                            <div key={action} className="flex items-center space-x-2">
                                                {taken ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-gray-400" />
                                                )}
                                                <span className="text-sm capitalize">{action.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* User Notes */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Notes & Updates</h3>
                                    {editingNotes !== '' ? (
                                        <div className="space-y-3">
                                            <Textarea
                                                value={editingNotes}
                                                onChange={(e) => setEditingNotes(e.target.value)}
                                                placeholder="Add or update notes..."
                                                rows={3}
                                            />
                                            <div className="flex space-x-2">
                                                <Button
                                                    onClick={() => handleUpdateNotes(selectedEvidence._id, editingNotes)}
                                                    size="sm"
                                                >
                                                    Save Notes
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingNotes('')}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm text-gray-600 mb-2">
                                                {selectedEvidence.meta.userNotes || 'No notes added yet.'}
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setEditingNotes(selectedEvidence.meta.userNotes || '')}
                                            >
                                                <Edit className="w-4 h-4 mr-2" />
                                                {selectedEvidence.meta.userNotes ? 'Edit Notes' : 'Add Notes'}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* Share Information */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Sharing</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <Label>Share Token</Label>
                                            <p className="text-sm text-gray-600 font-mono">{selectedEvidence.evidence.shareToken}</p>
                                        </div>
                                        <div>
                                            <Label>Expires At</Label>
                                            <p className="text-sm text-gray-600">{formatDate(selectedEvidence.evidence.shareExpiresAt)}</p>
                                        </div>
                                        <div>
                                            <Label>Access Count</Label>
                                            <p className="text-sm text-gray-600">{selectedEvidence.evidence.accessCount} times</p>
                                        </div>
                                        <Button onClick={() => handleShare(selectedEvidence)}>
                                            <Share2 className="w-4 h-4 mr-2" />
                                            Copy Share Link
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="pt-6 text-center text-gray-500">
                                Select an evidence item from the list to view detailed information.
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Share URL Alert */}
            {shareUrl && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                        Share link copied to clipboard: <strong>{shareUrl}</strong>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
};

export default EvidenceManager;
