import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, Save, AlertCircle, Globe, EyeOff, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { getWriterWithSubmissions, type WriterDetailWithSubmissions } from "@/services/portalApi";

const statusColors: Record<string, string> = {
  Received: "bg-blue-500/10 text-blue-600",
  "Under Initial Review": "bg-yellow-500/10 text-yellow-600",
  "Under Editorial Review": "bg-purple-500/10 text-purple-600",
  "Action Required": "bg-orange-500/10 text-orange-600",
  Approved: "bg-green-500/10 text-green-600",
  Formatting: "bg-teal-500/10 text-teal-600",
  "Scheduled for Publication": "bg-indigo-500/10 text-indigo-600",
  Published: "bg-primary/10 text-primary",
  Rejected: "bg-destructive/10 text-destructive",
  Withdrawn: "bg-muted text-muted-foreground",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminWriterDetail() {
  const { id } = useParams<{ id: string }>();
  const [writer, setWriter] = useState<WriterDetailWithSubmissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [penName, setPenName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [socialMediaLink, setSocialMediaLink] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void loadWriterData();
  }, [id]);

  async function loadWriterData() {
    setLoading(true);
    setError(null);
    const res = await getWriterWithSubmissions(id!);
    if (!res.success) {
      setError(res.error);
    } else {
      setWriter(res.data);
      setFullName(res.data.full_name);
      setPenName(res.data.pen_name ?? "");
      setEmail(res.data.email);
      setWhatsapp(res.data.whatsapp ?? "");
      setBio(res.data.bio ?? "");
      setSocialMediaLink(res.data.social_media_link ?? "");
      setIsPublic(res.data.is_public);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!writer || !id) return;
    setSaving(true);
    setSaveMsg(null);

    const { error: err } = await supabase
      .from("writers")
      .update({
        full_name: fullName.trim(),
        pen_name: penName.trim() || null,
        email: email.trim(),
        whatsapp: whatsapp.trim() || null,
        bio: bio.trim() || null,
        social_media_link: socialMediaLink.trim() || null,
        is_public: isPublic,
      })
      .eq("id", id);

    if (err) {
      setSaveMsg("❌ Save failed: " + err.message);
    } else {
      setSaveMsg("✓ Saved successfully");
      setWriter((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName.trim(),
              pen_name: penName.trim() || null,
              email: email.trim(),
              whatsapp: whatsapp.trim() || null,
              bio: bio.trim() || null,
              social_media_link: socialMediaLink.trim() || null,
              is_public: isPublic,
            }
          : null,
      );
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !writer) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" /> {error ?? "Writer not found"}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <Link
          to="/admin/writers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to writers list
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{writer.full_name}</h1>
            {writer.pen_name && writer.pen_name !== writer.full_name && (
              <p className="text-sm text-muted-foreground mt-1">Pen Name: {writer.pen_name}</p>
            )}
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isPublic
                ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {isPublic ? (
              <>
                <Globe className="h-3.5 w-3.5" /> Public on /writers
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5" /> Private Directory Only
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT/MID — Writer Profile form */}
        <div className="lg:col-span-2 space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-soft">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Writer Profile
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="writer-name">Full Name</Label>
                <Input
                  id="writer-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="writer-penname">Pen Name</Label>
                <Input
                  id="writer-penname"
                  value={penName}
                  onChange={(e) => setPenName(e.target.value)}
                  placeholder="Leave empty if same as full name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="writer-email">Email address</Label>
                <Input
                  id="writer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="writer-whatsapp">WhatsApp Number</Label>
                <Input
                  id="writer-whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+92 300 1234567"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="writer-bio">Author Bio</Label>
              <Textarea
                id="writer-bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Author biography..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="writer-social">Social Media Link</Label>
              <Input
                id="writer-social"
                value={socialMediaLink}
                onChange={(e) => setSocialMediaLink(e.target.value)}
                placeholder="https://facebook.com/yourprofile"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save profile changes
              </Button>
              {saveMsg && (
                <span
                  className={`text-xs ${saveMsg.startsWith("✓") ? "text-green-600" : "text-destructive"}`}
                >
                  {saveMsg}
                </span>
              )}
            </div>
          </section>

          {/* Submissions History list */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-soft">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Submission History ({writer.submissions.length})
            </h2>

            {writer.submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4">No submissions found for this writer.</p>
            ) : (
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
                      <th className="px-4 py-2.5">Code</th>
                      <th className="px-4 py-2.5">Novel Title</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Submitted</th>
                      <th className="px-4 py-2.5">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {writer.submissions.map((sub) => (
                      <tr
                        key={sub.id}
                        className="border-b border-border/40 hover:bg-muted/10 transition-colors last:border-b-0 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-primary">
                          <Link to={`/admin/submissions/${sub.id}`} className="hover:underline">
                            {sub.submission_code}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <Link to={`/admin/submissions/${sub.id}`} className="hover:underline">
                            {sub.novel_title}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              statusColors[sub.current_status] ?? "bg-muted text-muted-foreground"
                            }`}
                          >
                            {sub.current_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatDate(sub.submission_date)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs font-medium">
                          {formatDate(sub.last_updated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT — Summary sidebar */}
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-soft">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Registration Info
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono text-xs">{writer.id}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <dt className="text-muted-foreground">Registered</dt>
                <dd className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDate(writer.registration_date)}
                </dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-muted-foreground">Submissions count</dt>
                <dd className="font-semibold">{writer.submissions.length}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
