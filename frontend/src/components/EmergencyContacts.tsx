import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Phone, Mail, Trash2, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

const API_URL = "http://localhost:8000/api/contacts";
const ALERT_API_URL = "http://localhost:8000/api/alert-primary-contact";
const USER_ID = "USER_ID"; // 🔑 replace with actual logged-in userId

interface Contact {
  _id: string;
  name: string;
  phoneE164: string;
  email?: string;
  relationship?: string;
  isPrimary: boolean;
}

const EmergencyContacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const [newContact, setNewContact] = useState({
    name: "",
    phoneE164: "",
    email: "",
    relationship: "",
  });

  const [alertSending, setAlertSending] = useState(false);
  const [alertResult, setAlertResult] = useState<string | null>(null);

  // Fetch contacts from backend
  const fetchContacts = async () => {
    try {
      setLoading(true);
      console.log("📡 Fetching contacts for user:", USER_ID);

      const res = await axios.get(`${API_URL}/${USER_ID}`);
      console.log("✅ Contacts fetched:", res.data);

      setContacts(res.data.contacts);
    } catch (error) {
      console.error("❌ Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Add contact
  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phoneE164) {
      console.warn("⚠️ Name and phone are required!");
      return;
    }

    const payload = {
      userId: USER_ID,
      ...newContact,
      isPrimary: contacts.length === 0,
    };

    console.log("📤 Sending add contact request:", payload);

    try {
      const res = await axios.post(`${API_URL}/add`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      console.log("✅ Contact added successfully:", res.data);

      await fetchContacts();
      setNewContact({ name: "", phoneE164: "", email: "", relationship: "" });
    } catch (err) {
      console.error("❌ Error adding contact:", err);
    }
  };

  // Delete contact
  const handleDeleteContact = async (id: string) => {
    console.log("🗑️ Deleting contact:", id);

    try {
      const res = await axios.post(`${API_URL}/delete`, { userId: USER_ID, contactId: id });
      console.log("✅ Contact deleted:", res.data);

      await fetchContacts();
    } catch (error) {
      console.error("❌ Error deleting contact:", error);
    }
  };

  // Set as primary
  const handleSetPrimary = async (id: string) => {
    console.log("⭐ Setting contact as primary:", id);

    try {
      const res = await axios.post(`${API_URL}/set-primary`, { userId: USER_ID, contactId: id });
      console.log("✅ Primary contact updated:", res.data);

      await fetchContacts();
    } catch (error) {
      console.error("❌ Error setting primary:", error);
    }
  };

  // Remove primary
  const handleRemovePrimary = async (id: string) => {
    console.log("🚫 Removing primary from contact:", id);

    try {
      const res = await axios.post(`${API_URL}/remove-primary`, { userId: USER_ID, contactId: id });
      console.log("✅ Primary removed:", res.data);

      await fetchContacts();
    } catch (error) {
      console.error("❌ Error removing primary:", error);
    }
  };

  // Send alert SMS to primary contact with live location
  const handleSendAlert = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setAlertSending(true);
    setAlertResult(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await axios.post(ALERT_API_URL, {
            latitude,
            longitude,
          });

          if (response.data.success) {
            setAlertResult("Alert sent successfully!");
          } else {
            setAlertResult("Failed to send alert: " + response.data.error);
          }
        } catch (error: any) {
          setAlertResult("Error sending alert: " + (error.message || error.toString()));
        } finally {
          setAlertSending(false);
        }
      },
      (error) => {
        setAlertSending(false);
        setAlertResult("Error getting location: " + error.message);
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Emergency Contacts</h2>
          <p className="text-sm text-muted-foreground">Manage your trusted contacts</p>
        </div>

        {/* Add Contact Dialog */}
        <Dialog>
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
                <Label>Name *</Label>
                <Input
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Enter contact name"
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  type="tel"
                  value={newContact.phoneE164}
                  onChange={(e) => setNewContact({ ...newContact, phoneE164: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label>Relationship</Label>
                <Input
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  placeholder="Mother, Friend, Son etc."
                />
              </div>

              <div className="flex gap-2 pt-4">
                {/* ✅ Close modal after adding */}
                <DialogClose asChild>
                  <Button onClick={handleAddContact} className="flex-1">
                    Add Contact
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Send Alert Button */}
      <div className="pt-6">
        <Button
          onClick={handleSendAlert}
          disabled={alertSending}
          className="bg-red-600 text-white"
        >
          {alertSending ? "Sending Alert..." : "Send Safety Alert to Primary Contact"}
        </Button>
        {alertResult && (
          <p className="mt-2 text-sm text-muted-foreground">
            {alertResult}
          </p>
        )}
      </div>

      {/* Contacts List */}
      <div className="space-y-3">
        {loading ? (
          <p>Loading contacts...</p>
        ) : contacts.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Emergency Contacts</h3>
              <p className="text-sm mb-4">
                Add trusted contacts who will be notified during emergencies
              </p>
            </div>
          </Card>
        ) : (
          contacts.map((c) => (
            <Card key={c._id} className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">{c.name}</h3>
                      {c.isPrimary && (
                        <Badge className="bg-success text-success-foreground">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{c.phoneE164}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{c.email}</span>
                        </div>
                      )}
                      {c.relationship && (
                        <Badge variant="outline" className="text-xs">
                          {c.relationship}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        c.isPrimary ? handleRemovePrimary(c._id) : handleSetPrimary(c._id)
                      }
                    >
                      {c.isPrimary ? "Remove Primary" : "Set Primary"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteContact(c._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default EmergencyContacts;
