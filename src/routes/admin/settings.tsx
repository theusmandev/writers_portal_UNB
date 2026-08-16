import { useEffect, useState } from "react";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { getSubmissionSettings, updateSubmissionSettings, getNotificationSettings, updateNotificationSettings, getEpisodeMinimumExceptions, addEpisodeMinimumException, removeEpisodeMinimumException, type EpisodeMinimumException } from "@/services/portalApi";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Trash2, Plus, Loader2 } from "lucide-react";

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState("");

  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationLinkUrl, setNotificationLinkUrl] = useState("");
  const [notificationLinkText, setNotificationLinkText] = useState("");

  const [exceptions, setExceptions] = useState<EpisodeMinimumException[]>([]);
  const [loadingExceptions, setLoadingExceptions] = useState(false);
  const [newExceptionEmail, setNewExceptionEmail] = useState("");
  const [newExceptionNote, setNewExceptionNote] = useState("");
  const [addingException, setAddingException] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await getSubmissionSettings();
    if (result.success) {
      setPaused(result.data.submissions_paused);
      setMessage(result.data.pause_message || "");
    } else {
      setError(result.error);
    }
    
    const notifResult = await getNotificationSettings();
    if (notifResult.success) {
      setNotificationEnabled(notifResult.data.notification_enabled);
      setNotificationMessage(notifResult.data.notification_message || "");
      setNotificationLinkUrl(notifResult.data.notification_link_url || "");
      setNotificationLinkText(notifResult.data.notification_link_text || "");
    }
    
    setLoadingExceptions(true);
    const exceptionsResult = await getEpisodeMinimumExceptions();
    if (exceptionsResult.success) {
      setExceptions(exceptionsResult.data);
    }
    setLoadingExceptions(false);
    
    setLoading(false);
  }

  async function handleAddException(e: React.FormEvent) {
    e.preventDefault();
    if (!newExceptionEmail || !/^\S+@\S+\.\S+$/.test(newExceptionEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setAddingException(true);
    setError(null);
    setSuccess(null);
    
    const res = await addEpisodeMinimumException(newExceptionEmail, newExceptionNote);
    if (res.success) {
      setSuccess("Exception added successfully.");
      setNewExceptionEmail("");
      setNewExceptionNote("");
      // Reload exceptions
      const updated = await getEpisodeMinimumExceptions();
      if (updated.success) setExceptions(updated.data);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(res.error);
    }
    setAddingException(false);
  }

  async function handleRemoveException(id: string) {
    if (!confirm("Are you sure you want to remove this exception?")) return;
    setError(null);
    setSuccess(null);
    const res = await removeEpisodeMinimumException(id);
    if (res.success) {
      setSuccess("Exception removed.");
      setExceptions(prev => prev.filter(e => e.id !== id));
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(res.error);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const [result, notifResultSave] = await Promise.all([
      updateSubmissionSettings(paused, message),
      updateNotificationSettings(notificationEnabled, notificationMessage, notificationLinkUrl, notificationLinkText)
    ]);

    if (result.success && notifResultSave.success) {
      setSuccess("Settings saved successfully.");
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || notifResultSave.error || "Failed to save settings.");
    }
    setSaving(false);
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage site-wide configurations.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-4 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <p>{success}</p>
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Site Notification Bar</h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="notification-toggle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Show Notification Bar
              </label>
              <p className="text-sm text-muted-foreground">
                Display a dismissible notification at the top of every page.
              </p>
            </div>
            <Switch
              id="notification-toggle"
              checked={notificationEnabled}
              onCheckedChange={setNotificationEnabled}
              disabled={loading || saving}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Notification Message
            </label>
            <p className="text-sm text-muted-foreground">
              The message to show. Saving a changed message will reset dismissals so it reappears for everyone.
            </p>
            <RichTextEditor
              value={notificationMessage}
              onChange={setNotificationMessage}
              placeholder="e.g., Submissions for our upcoming anthology open next week!"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="notif-link-url" className="text-sm font-medium leading-none">
                Link URL (Optional)
              </label>
              <Input
                id="notif-link-url"
                placeholder="e.g. https://chat.whatsapp.com/..."
                value={notificationLinkUrl}
                onChange={(e) => setNotificationLinkUrl(e.target.value)}
                disabled={loading || saving}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="notif-link-text" className="text-sm font-medium leading-none">
                Link Text (Optional)
              </label>
              <Input
                id="notif-link-text"
                placeholder="e.g. Join our WhatsApp Channel"
                value={notificationLinkText}
                onChange={(e) => setNotificationLinkText(e.target.value)}
                disabled={loading || saving}
              />
            </div>
          </div>
          
          <Button onClick={handleSave} disabled={loading || saving} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Notification Settings"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Submission Settings</h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="pause-toggle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Pause New Submissions
              </label>
              <p className="text-sm text-muted-foreground">
                Temporarily disable the /submit page for new submissions.
              </p>
            </div>
            <Switch
              id="pause-toggle"
              checked={paused}
              onCheckedChange={setPaused}
              disabled={loading || saving}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="pause-message" className="text-sm font-medium leading-none">
              Pause Message
            </label>
            <p className="text-sm text-muted-foreground">
              The message shown to writers when they visit the submission form while paused.
            </p>
            <RichTextEditor
              value={message}
              onChange={setMessage}
              placeholder="e.g., We are temporarily not accepting new submissions..."
            />
          </div>
          
          <Button onClick={handleSave} disabled={loading || saving} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Episode Minimum Exceptions</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Writers in this list can submit an "Ongoing" novel with just 1 episode, instead of the standard minimum of 5.
        </p>

        <form onSubmit={handleAddException} className="mb-8 grid gap-4 sm:grid-cols-[1fr_1fr_auto] items-start">
          <div className="space-y-1.5">
            <label htmlFor="exc-email" className="text-sm font-medium">Writer Email</label>
            <Input 
              id="exc-email" 
              type="email" 
              placeholder="writer@example.com" 
              value={newExceptionEmail}
              onChange={(e) => setNewExceptionEmail(e.target.value)}
              disabled={addingException}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="exc-note" className="text-sm font-medium">Note (Optional)</label>
            <Input 
              id="exc-note" 
              placeholder="Admin note for this exception" 
              value={newExceptionNote}
              onChange={(e) => setNewExceptionNote(e.target.value)}
              disabled={addingException}
            />
          </div>
          <div className="pt-6">
            <Button type="submit" disabled={addingException} className="w-full">
              {addingException ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Email
            </Button>
          </div>
        </form>

        <div className="rounded-lg border">
          {loadingExceptions ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : exceptions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No exceptions currently set.
            </div>
          ) : (
            <div className="divide-y">
              {exceptions.map(exc => (
                <div key={exc.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{exc.email}</p>
                    {exc.note && <p className="text-sm text-muted-foreground">{exc.note}</p>}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveException(exc.id)}
                    title="Remove exception"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
