import { useEffect, useState } from "react";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { getSubmissionSettings, updateSubmissionSettings } from "@/services/portalApi";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState("");

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
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    const result = await updateSubmissionSettings(paused, message);
    if (result.success) {
      setSuccess("Settings saved successfully.");
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
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
            <Textarea
              id="pause-message"
              placeholder="e.g., We are temporarily not accepting new submissions..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading || saving}
              rows={4}
            />
          </div>
          
          <Button onClick={handleSave} disabled={loading || saving} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
