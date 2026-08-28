import { useCallback, useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { ResizableImage } from './ResizableImage';
import TextAlign from '@tiptap/extension-text-align';
import { Extension, Mark, mergeAttributes } from '@tiptap/core';

// Custom ID and Class Global Attributes Extension
const CustomAttributes = Extension.create({
  name: 'customAttributes',
  addGlobalAttributes() {
    return [
      {
        // Apply to all standard block and inline elements
        types: ['paragraph', 'heading', 'link', 'image', 'blockquote', 'bulletList', 'orderedList', 'listItem'],
        attributes: {
          id: {
            default: null,
            parseHTML: element => element.getAttribute('id'),
            renderHTML: attributes => {
              if (!attributes.id) return {};
              return { id: attributes.id };
            },
          },
          class: {
            default: null,
            parseHTML: element => element.getAttribute('class'),
            renderHTML: attributes => {
              if (!attributes.class) return {};
              return { class: attributes.class };
            },
          },
        },
      },
    ];
  },
} as any);

// Custom Text Direction Extension
const TextDirection = Extension.create({
  name: 'textDirection',
  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph'],
        attributes: {
          dir: {
            default: null,
            parseHTML: element => element.dir || null,
            renderHTML: attributes => {
              if (!attributes.dir) return {};
              return { dir: attributes.dir };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setDir: (dir: string) => ({ commands }: any) => {
        return ['heading', 'paragraph'].map(type => commands.updateAttributes(type, { dir })).some(res => res);
      },
    };
  },
} as any);

// Custom Font Size Mark
const FontSize = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
        renderHTML: attributes => {
          if (!attributes.size) return {}
          return { style: `font-size: ${attributes.size}` }
        },
      },
    }
  },
  parseHTML() {
    return [
      {
        style: 'font-size',
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ commands }: any) => {
        return commands.setMark('fontSize', { size })
      },
      unsetFontSize: () => ({ commands }: any) => {
        return commands.unsetMark('fontSize')
      },
    }
  },
} as any);
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Eraser,
  Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, 
  Link as LinkIcon, Image as ImageIcon, 
  AlignLeft, AlignCenter, AlignRight,
  Undo, Redo, Loader2, Code2, WrapText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { uploadFileToScript } from '@/services/portalApi';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  postFolderToken?: string;
  size?: 'default' | 'compact';
}

export function RichTextEditor({ content, onChange, postFolderToken, size = 'default' }: RichTextEditorProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'html'>('visual');
  const [htmlContent, setHtmlContent] = useState(content);

  const toggleViewMode = () => {
    if (viewMode === 'visual') {
      setHtmlContent(editor?.getHTML() || '');
      setViewMode('html');
    } else {
      editor?.commands.setContent(htmlContent);
      setViewMode('visual');
    }
  };

  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      ResizableImage,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextDirection,
      CustomAttributes,
      FontSize,
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-stone dark:prose-invert max-w-none ${size === 'compact' ? 'min-h-[80px]' : 'min-h-[400px]'} p-6 focus:outline-none urdu prose-headings:font-urdu prose-p:leading-loose prose-headings:leading-[1.8] leading-loose`,
        dir: 'auto',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastUpdateRef.current = html;
      onChange(html);
    },
  });

  const lastUpdateRef = useRef<string>(content);

  useEffect(() => {
    if (editor && content !== lastUpdateRef.current) {
      editor.commands.setContent(content);
      lastUpdateRef.current = content;
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (linkUrl === null) return;
    if (linkUrl === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      setIsLinkDialogOpen(false);
      return;
    }
    
    // Auto-prefix with https:// if no protocol provided
    let finalUrl = linkUrl;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    editor?.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    setLinkUrl('');
    setIsLinkDialogOpen(false);
  }, [editor, linkUrl]);

  const openLinkDialog = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    setLinkUrl(previousUrl || '');
    setIsLinkDialogOpen(true);
  }, [editor]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Use the stable postFolderToken if available, otherwise fallback to pseudo-id
      const token = postFolderToken || ("POST_IMAGE_" + Date.now());
      const res = await uploadFileToScript(token, "image", file);
      
      if (res.success && res.fileId) {
        const embedUrl = `https://lh3.googleusercontent.com/d/${res.fileId}=w1000`;
        editor?.chain().focus().setImage({ src: embedUrl }).run();
        setIsImageDialogOpen(false);
      } else {
        setUploadError(res.error || "Failed to upload image.");
      }
    } catch (err: any) {
      setUploadError(err.message || "An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUrlSubmit = () => {
    if (imageUrl) {
      editor?.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setIsImageDialogOpen(false);
    }
  };

  if (!editor) return null;

  const ToolbarButton = ({ onClick, active = false, disabled = false, children, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-md transition-colors flex items-center justify-center
        ${active ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card flex flex-col shadow-sm focus-within:border-primary/50 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b border-border bg-muted/40">
        
        <div className="flex flex-wrap items-center gap-1">
          {viewMode === 'visual' && (
            <>
              {/* Text Styles */}
        <div className="flex items-center gap-1 pr-2 border-r border-border">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">
            <Eraser className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Font Size */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          <Select 
            value={editor.getAttributes('fontSize').size || 'default'} 
            onValueChange={(val) => {
              if (val === 'default') {
                (editor.chain().focus() as any).unsetFontSize().run();
              } else {
                (editor.chain().focus() as any).setFontSize(val).run();
              }
            }}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs bg-transparent border-0 shadow-none focus:ring-0 focus-visible:ring-0 text-muted-foreground hover:bg-muted hover:text-foreground">
              <SelectValue placeholder="Font Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Normal</SelectItem>
              <SelectItem value="14px">Small</SelectItem>
              <SelectItem value="20px">Large</SelectItem>
              <SelectItem value="24px">Extra Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Lists & Quotes & Break */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHardBreak().run()} title="Line Break">
            <WrapText className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Alignment & Direction */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => (editor.chain().focus() as any).setDir('ltr').run()} active={editor.isActive({ dir: 'ltr' })} title="Left-to-Right">
            <span className="text-xs font-bold leading-none tracking-tighter">LTR</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => (editor.chain().focus() as any).setDir('rtl').run()} active={editor.isActive({ dir: 'rtl' })} title="Right-to-Left">
            <span className="text-xs font-bold leading-none tracking-tighter">RTL</span>
          </ToolbarButton>
        </div>

        {/* Media */}
        <div className="flex items-center gap-1 px-2 border-r border-border">
          <ToolbarButton onClick={openLinkDialog} active={editor.isActive('link')} title="Insert Link">
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => setIsImageDialogOpen(true)} title="Insert Image">
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 pl-2">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>
            </>
          )}
          {viewMode === 'html' && (
            <div className="flex items-center h-8 px-2 text-sm font-medium text-muted-foreground">
              HTML Source View
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center pr-2">
          <Button 
            type="button"
            variant={viewMode === 'html' ? "default" : "outline"}
            size="sm"
            onClick={toggleViewMode}
            className="h-8 gap-2"
          >
            <Code2 className="w-4 h-4" />
            {viewMode === 'visual' ? 'View HTML' : 'View Visual'}
          </Button>
        </div>
      </div>

      <div className="bg-card">
        <div style={{ display: viewMode === 'visual' ? 'block' : 'none' }}>
          <EditorContent editor={editor} />
        </div>
        {viewMode === 'html' && (
          <Textarea 
            value={htmlContent}
            onChange={(e) => {
              setHtmlContent(e.target.value);
              onChange(e.target.value);
            }}
            className={`${size === 'compact' ? 'min-h-[80px]' : 'min-h-[400px]'} w-full resize-y rounded-none border-0 font-mono text-sm leading-relaxed p-6 focus-visible:ring-0 bg-zinc-950 text-zinc-50 dark:bg-zinc-950 dark:text-zinc-50`}
            placeholder="<p>Enter HTML here...</p>"
            dir="ltr"
            spellCheck={false}
          />
        )}
      </div>

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>URL</Label>
              <Input 
                type="url" 
                placeholder="https://..." 
                value={linkUrl} 
                onChange={(e) => setLinkUrl(e.target.value)} 
                onKeyDown={(e) => { if(e.key === 'Enter') setLink(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (editor.isActive('link')) {
                setLinkUrl('');
                setLink(); // This unsets the link
              } else {
                setIsLinkDialogOpen(false);
              }
            }}>
              {editor.isActive('link') ? "Remove Link" : "Cancel"}
            </Button>
            <Button onClick={setLink}>Save Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
            <DialogDescription>
              Upload an image from your device or paste a URL.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="upload" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload from Device</TabsTrigger>
              <TabsTrigger value="url">Paste Image URL</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="py-4">
              <div className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="picture">Select Image File</Label>
                  <Input 
                    id="picture" 
                    type="file" 
                    accept="image/*" 
                    disabled={isUploading}
                    onChange={(e) => void handleImageUpload(e)}
                  />
                </div>
                {isUploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading to Drive...
                  </div>
                )}
                {uploadError && (
                  <div className="text-sm text-destructive font-medium">
                    {uploadError}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="url" className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input 
                  type="url" 
                  placeholder="https://example.com/image.jpg" 
                  value={imageUrl} 
                  onChange={(e) => setImageUrl(e.target.value)} 
                  onKeyDown={(e) => { if(e.key === 'Enter') handleImageUrlSubmit(); }}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleImageUrlSubmit} disabled={!imageUrl}>
                  Insert
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
