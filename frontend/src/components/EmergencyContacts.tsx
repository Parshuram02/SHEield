import React, { useState, useEffect } from 'react';
import { Plus, Phone, Mail, Edit, Trash2, UserCheck, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Contact {
  _id?: string;
  id?: string;
  name: string;
  phone: string;
  phoneE164?: string;
  email?: string;
  relationship: string;
  isPrimary: boolean;
  verifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const EmergencyContacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
  });

  // Use a default userId for now (in a real app, this would come from auth)
  const userId = 'default';

  // API functions
  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/contacts/${userId}`, {
        headers: {
          'X-API-Key': 'change-me' // This should match your backend API key
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch contacts`);
      }
      
      // Check if response has content before parsing JSON
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.warn('Empty response from contacts API');
        setContacts([]);
        return;
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', text);
        throw new Error('Invalid JSON response from server');
      }
      
      setContacts(data.data || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to backend server. Please make sure the backend is running on port 8000.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load contacts. Please check if the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const createContact = async (contactData: any) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'change-me'
        },
        body: JSON.stringify({
          userId,
          name: contactData.name,
          phoneE164: contactData.phone,
          relationship: contactData.relationship,
          isPrimary: contacts.length === 0
        })
      });
      
      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = text ? JSON.parse(text) : { error: 'Unknown error' };
        } catch {
          errorData = { error: `HTTP ${response.status}: ${text || 'Unknown error'}` };
        }
        throw new Error(errorData.error || 'Failed to create contact');
      }
      
      const text = await response.text();
      if (!text || text.trim() === '') {
        throw new Error('Empty response from server');
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', text);
        throw new Error('Invalid JSON response from server');
      }
      setContacts([...contacts, data.data]);
      return data.data;
    } catch (err) {
      console.error('Error creating contact:', err);
      setError(err instanceof Error ? err.message : 'Failed to create contact');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (contactId: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': 'change-me'
        }
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text || 'Failed to delete contact'}`);
      }
      
      setContacts(contacts.filter(contact => (contact._id || contact.id) !== contactId));
    } catch (err) {
      console.error('Error deleting contact:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete contact');
    }
  };

  const updateContact = async (contactId: string, updates: any) => {
    try {
      setError(null);
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'change-me'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text || 'Failed to update contact'}`);
      }
      
      const text = await response.text();
      if (!text || text.trim() === '') {
        throw new Error('Empty response from server');
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', text);
        throw new Error('Invalid JSON response from server');
      }
      setContacts(contacts.map(contact => 
        (contact._id || contact.id) === contactId ? data.data : contact
      ));
    } catch (err) {
      console.error('Error updating contact:', err);
      setError(err instanceof Error ? err.message : 'Failed to update contact');
    }
  };

  // Load contacts on component mount
  useEffect(() => {
    fetchContacts();
  }, []);

  // Add a fallback for when backend is not available
  const handleBackendUnavailable = () => {
    setError('Backend server is not running. Please start the backend server on port 8000.');
    setLoading(false);
  };

  const handleAddContact = async () => {
    if (newContact.name && newContact.phone) {
      try {
        await createContact(newContact);
        setNewContact({ name: '', phone: '', email: '', relationship: '' });
        setIsAddingContact(false);
      } catch (err) {
        // Error is already handled in createContact
      }
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      await deleteContact(id);
    }
  };

  const togglePrimary = async (id: string) => {
    const contact = contacts.find(c => (c._id || c.id) === id);
    if (contact) {
      await updateContact(id, { isPrimary: !contact.isPrimary });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Emergency Contacts</h2>
          <p className="text-sm text-muted-foreground">Manage your trusted contacts</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchContacts}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isAddingContact} onOpenChange={setIsAddingContact}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Emergency Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Enter contact name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="relationship">Relationship</Label>
                <Input
                  id="relationship"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  placeholder="Mother, Friend, etc."
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddContact} className="flex-1" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Contact'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingContact(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading contacts...</span>
        </div>
      )}

      {/* Contacts List */}
      {!loading && (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Card key={contact._id || contact.id} className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{contact.name}</h3>
                    {contact.isPrimary && (
                      <Badge className="bg-success text-success-foreground">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Primary
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{contact.phone}</span>
                    </div>
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{contact.email}</span>
                      </div>
                    )}
                    {contact.relationship && (
                      <Badge variant="outline" className="text-xs">
                        {contact.relationship}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePrimary(contact._id || contact.id || '')}
                  >
                    {contact.isPrimary ? 'Remove Primary' : 'Set Primary'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteContact(contact._id || contact.id || '')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {!loading && contacts.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Emergency Contacts</h3>
            <p className="text-sm mb-4">Add trusted contacts who will be notified during emergencies</p>
            <Button onClick={() => setIsAddingContact(true)}>
              Add Your First Contact
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default EmergencyContacts;