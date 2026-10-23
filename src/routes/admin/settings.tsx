import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, AlertCircle, Trash2, Plus, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { SITE_SETTINGS_QUERY_KEY } from "@/hooks/useSiteSettings";
import { 
  getSubmissionSettings, 
  updateSubmissionSettings, 
  getNotificationSettings, 
  updateNotificationSettings, 
  getEpisodeMinimumExceptions, 
  addEpisodeMinimumException, 
  removeEpisodeMinimumException, 
  updateCustomHeadCode, 
  getSiteSettings, 
  updateContactAndWidgetSettings, 
  type EpisodeMinimumException 
} from "@/services/portalApi";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { AdminPagination } from "@/components/admin/AdminPagination";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  
  const [savingNotification, setSavingNotification] = useState(false);
  const [savingSubmission, setSavingSubmission] = useState(false);
  const [savingPublishSite, setSavingPublishSite] = useState(false);
  const [savingHeadCode, setSavingHeadCode] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savingWidget, setSavingWidget] = useState(false);
  
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState("");
  const [preferredPublishSite, setPreferredPublishSite] = useState<"unb" | "ufb">("unb");

  const [supportEmail, setSupportEmail] = useState("");
  const [mainWebsiteUrl, setMainWebsiteUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [showFloatingWidget, setShowFloatingWidget] = useState(true);

  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationLinkUrl, setNotificationLinkUrl] = useState("");
  const [notificationLinkText, setNotificationLinkText] = useState("");
  const [customHeadCode, setCustomHeadCode] = useState("");

  const [exceptions, setExceptions] = useState<EpisodeMinimumException[]>([]);
  const [loadingExceptions, setLoadingExceptions] = useState(false);
  const [newExceptionEmail, setNewExceptionEmail] = useState("");
  const [newExceptionNote, setNewExceptionNote] = useState("");
  const [addingException, setAddingException] = useState(false);
  const [exceptionsPage, setExceptionsPage] = useState(1);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const result = await getSubmissionSettings();
    if (result.success) {
      setPaused(result.data.submissions_paused);
      setMessage(result.data.pause_message || "");
      setPreferredPublishSite(result.data.preferred_publish_site ?? "unb");
    } else {
      toast.error(result.error);
    }
    
    const notifResult = await getNotificationSettings();
    if (notifResult.success) {
      setNotificationEnabled(notifResult.data.notification_enabled);
      setNotificationMessage(notifResult.data.notification_message || "");
      setNotificationLinkUrl(notifResult.data.notification_link_url || "");
      setNotificationLinkText(notifResult.data.notification_link_text || "");
      setCustomHeadCode(notifResult.data.custom_head_code || "");
    }
    
    const siteSettingsResult = await getSiteSettings();
    if (siteSettingsResult.success) {
      setSupportEmail(siteSettingsResult.data.support_email || "");
      setMainWebsiteUrl(siteSettingsResult.data.main_website_url || "");
      setInstagramHandle(siteSettingsResult.data.instagram_handle || "");
      setInstagramUrl(siteSettingsResult.data.instagram_url || "");
      setShowFloatingWidget(siteSettingsResult.data.show_floating_widget !== false);
    }
    
    setLoadingExceptions(true);
    const exceptionsResult = await getEpisodeMinimumExceptions();
    if (exceptionsResult.success) {
      setExceptions(exceptionsResult.data);
    }
    setLoadingExceptions(false);
    
    setLoading(false);
  }

  async function handleSaveNotification() {
    setSavingNotification(true);
    const result = await updateNotificationSettings(notificationEnabled, notificationMessage, notificationLinkUrl, notificationLinkText);
    if (result.success) {
      toast.success("Notification settings saved successfully.");
    } else {
      toast.error(result.error || "Failed to save notification settings.");
    }
    setSavingNotification(false);
  }

  async function handleSaveSubmission() {
    setSavingSubmission(true);
    const result = await updateSubmissionSettings(paused, message, preferredPublishSite);
    if (result.success) {
      toast.success("Submission settings saved successfully.");
    } else {
      toast.error(result.error || "Failed to save submission settings.");
    }
    setSavingSubmission(false);
  }

  async function handleSavePublishSite() {
    setSavingPublishSite(true);
    const result = await updateSubmissionSettings(paused, message, preferredPublishSite);
    if (result.success) {
      toast.success("Preferred publish site updated successfully.");
    } else {
      toast.error(result.error || "Failed to update preferred publish site.");
    }
    setSavingPublishSite(false);
  }

  async function handleSaveHeadCode() {
    setSavingHeadCode(true);
    const result = await updateCustomHeadCode(customHeadCode);
    if (result.success) {
      toast.success("Custom head code saved successfully.");
    } else {
      toast.error(result.error || "Failed to save custom head code.");
    }
    setSavingHeadCode(false);
  }

  async function handleSaveContact() {
    setSavingContact(true);
    const result = await updateContactAndWidgetSettings({
      support_email: supportEmail,
      main_website_url: mainWebsiteUrl,
      instagram_handle: instagramHandle,
      instagram_url: instagramUrl,
      show_floating_widget: showFloatingWidget,
    });
    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEY });
      toast.success("Contact settings saved successfully.");
    } else {
      toast.error(result.error || "Failed to save contact settings.");
    }
    setSavingContact(false);
  }

  async function handleSaveWidget() {
    setSavingWidget(true);
    const result = await updateContactAndWidgetSettings({
      support_email: supportEmail,
      main_website_url: mainWebsiteUrl,
      instagram_handle: instagramHandle,
      instagram_url: instagramUrl,
      show_floating_widget: showFloatingWidget,
    });
    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEY });
      toast.success("Floating widget settings saved successfully.");
    } else {
      toast.error(result.error || "Failed to save floating widget settings.");
    }
    setSavingWidget(false);
  }

  async function handleAddException(e: React.FormEvent) {
    e.preventDefault();
    if (!newExceptionEmail || !/^\S+@\S+\.\S+$/.test(newExceptionEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setAddingException(true);
    
    const res = await addEpisodeMinimumException(newExceptionEmail, newExceptionNote);
    if (res.success) {
      toast.success("Exception added successfully.");
      setNewExceptionEmail("");
      setNewExceptionNote("");
      // Reload exceptions
      const updated = await getEpisodeMinimumExceptions();
      if (updated.success) setExceptions(updated.data);
    } else {
      toast.error(res.error);
    }
    setAddingException(false);
  }

  async function handleRemoveException(id: string) {
    if (!confirm("Are you sure you want to remove this exception?")) return;
    const res = await removeEpisodeMinimumException(id);
    if (res.success) {
      toast.success("Exception removed.");
      setExceptions(prev => {
        const updated = prev.filter(e => e.id !== id);
        const newTotalPages = Math.ceil(updated.length / 8);
        if (exceptionsPage > newTotalPages && newTotalPages > 0) {
          setExceptionsPage(newTotalPages);
        }
        return updated;
      });
    } else {
      toast.error(res.error);
    }
  }

  const itemsPerPage = 8;
  const exceptionsTotalPages = Math.ceil(exceptions.length / itemsPerPage);
  const paginatedExceptions = exceptions.slice((exceptionsPage - 1) * itemsPerPage, exceptionsPage * itemsPerPage);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage site-wide configurations.</p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Site Notification Bar</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); void handleSaveNotification(); }} className="space-y-6">
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
              disabled={loading || savingNotification}
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
              content={notificationMessage}
              onChange={setNotificationMessage}
              size="compact"
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
                disabled={loading || savingNotification}
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
                disabled={loading || savingNotification}
              />
            </div>
          </div>
          
          <Button type="submit" disabled={loading || savingNotification} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {savingNotification ? "Saving..." : "Save Notification Settings"}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Submission Settings</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); void handleSaveSubmission(); }} className="space-y-6">
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
              disabled={loading || savingSubmission}
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
              content={message}
              onChange={setMessage}
            />
          </div>
          
          <Button type="submit" disabled={loading || savingSubmission} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {savingSubmission ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Preferred Publish Site</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); void handleSavePublishSite(); }} className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              When a novel is available on both sites, which one should readers be sent to? If your preferred site's link is missing for a novel, the other one is used automatically.
            </p>
            <div className="flex gap-4 items-center pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="preferred-site"
                  value="unb"
                  checked={preferredPublishSite === "unb"}
                  onChange={() => setPreferredPublishSite("unb")}
                  disabled={loading || savingPublishSite}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">Urdu Novel Bank</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="preferred-site"
                  value="ufb"
                  checked={preferredPublishSite === "ufb"}
                  onChange={() => setPreferredPublishSite("ufb")}
                  disabled={loading || savingPublishSite}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">Urdu Fiction Bank</span>
              </label>
            </div>
          </div>
          
          <Button type="submit" disabled={loading || savingPublishSite} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {savingPublishSite ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Contact & Social Channels</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); void handleSaveContact(); }} className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Configure the official contact email, main website URL, and Instagram channels shown on the Contact page, Footer, and across the portal.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="support-email" className="text-sm font-medium leading-none">
                Support Email
              </label>
              <Input
                id="support-email"
                type="email"
                placeholder="urdunovelbankofficial@gmail.com"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                disabled={loading || savingContact}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="main-website-url" className="text-sm font-medium leading-none">
                Main Website URL
              </label>
              <Input
                id="main-website-url"
                type="url"
                placeholder="https://www.urdunovelbanks.com"
                value={mainWebsiteUrl}
                onChange={(e) => setMainWebsiteUrl(e.target.value)}
                disabled={loading || savingContact}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="instagram-handle" className="text-sm font-medium leading-none">
                Instagram Handle
              </label>
              <Input
                id="instagram-handle"
                placeholder="@urdunovelbank"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                disabled={loading || savingContact}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="instagram-url" className="text-sm font-medium leading-none">
                Instagram Profile URL
              </label>
              <Input
                id="instagram-url"
                type="url"
                placeholder="https://www.instagram.com/urdunovelbank"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                disabled={loading || savingContact}
                required
              />
            </div>
          </div>
          
          <Button type="submit" disabled={loading || savingContact} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {savingContact ? "Saving..." : "Save Contact Settings"}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Floating Help Widget</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); void handleSaveWidget(); }} className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="widget-toggle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Show Floating Instagram Widget
              </label>
              <p className="text-sm text-muted-foreground">
                Display the floating &quot;Need help?&quot; Instagram button at the bottom left of all public pages when users scroll down.
              </p>
            </div>
            <Switch
              id="widget-toggle"
              checked={showFloatingWidget}
              onCheckedChange={setShowFloatingWidget}
              disabled={loading || savingWidget}
            />
          </div>
          
          <Button type="submit" disabled={loading || savingWidget} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {savingWidget ? "Saving..." : "Save Widget Settings"}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Custom Head Code</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); void handleSaveHeadCode(); }} className="space-y-6">
          <div className="rounded-md bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                Advanced: paste tracking scripts or verification tags here (e.g. Google Analytics). This code runs unmodified on every public page — only paste code from sources you trust. Invalid code can break the site for visitors.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <textarea
              className="min-h-[200px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="<!-- Paste Google Analytics, Meta Pixel, etc. here -->"
              value={customHeadCode}
              onChange={(e) => setCustomHeadCode(e.target.value)}
              disabled={loading || savingHeadCode}
              spellCheck={false}
              dir="ltr"
            />
          </div>
          
          <Button type="submit" disabled={loading || savingHeadCode} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {savingHeadCode ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Episode Minimum Exceptions</h2>
          {!loadingExceptions && (
            <span className="text-sm font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
              {exceptions.length} {exceptions.length === 1 ? 'writer' : 'writers'} total
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Writers in this list can submit an "Ongoing" novel with just 1 episode, instead of the standard minimum of 3.
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
              {paginatedExceptions.map(exc => (
                <div key={exc.id} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium break-all">{exc.email}</p>
                    {exc.note && <p className="text-sm text-muted-foreground break-words">{exc.note}</p>}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="shrink-0 text-muted-foreground hover:text-destructive"
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
        
        {exceptionsTotalPages > 1 && (
          <AdminPagination 
            currentPage={exceptionsPage}
            totalPages={exceptionsTotalPages}
            onPageChange={setExceptionsPage}
          />
        )}
      </div>
    </div>
  );
}
