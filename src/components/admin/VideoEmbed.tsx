import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── URL helpers ───────────────────────────────────────────────────────

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

const VIMEO_REGEX =
  /(?:vimeo\.com\/)(\d+)/;

export type VideoPlatform = 'youtube' | 'vimeo';

export interface ParsedVideo {
  platform: VideoPlatform;
  videoId: string;
  embedUrl: string;
}

/**
 * Parse a user-provided URL and return platform, videoId, and embedUrl.
 * Returns null if the URL does not match YouTube or Vimeo.
 */
export function parseVideoUrl(url: string): ParsedVideo | null {
  const ytMatch = url.match(YOUTUBE_REGEX);
  if (ytMatch) {
    const videoId = ytMatch[1]!;
    return {
      platform: 'youtube',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    };
  }

  const vimeoMatch = url.match(VIMEO_REGEX);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1]!;
    return {
      platform: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
    };
  }

  return null;
}

// ─── Editor preview component ──────────────────────────────────────────

const VideoEmbedComponent = (props: any) => {
  const { node, updateAttributes, selected } = props;
  const { src, platform, width, align } = node.attrs;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [initialWidth, setInitialWidth] = useState(0);
  const [initialMousePosition, setInitialMousePosition] = useState(0);

  // Styling based on alignment
  let wrapperClass = 'relative inline-block my-4 clear-both';
  let wrapperStyle: React.CSSProperties = { 
    width: width || '100%', 
    maxWidth: '100%' 
  };

  if (align === 'center') {
    wrapperClass = 'relative block mx-auto my-4 text-center clear-both';
  } else if (align === 'left') {
    wrapperClass = 'relative inline-block float-left mr-4 my-2';
  } else if (align === 'right') {
    wrapperClass = 'relative inline-block float-right ml-4 my-2';
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!wrapperRef.current) return;
    
    setIsResizing(true);
    setInitialMousePosition(e.clientX);
    setInitialWidth(wrapperRef.current.clientWidth);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const diff = e.clientX - initialMousePosition;
      // Calculate new width in pixels, minimum 200px
      const newWidth = Math.max(200, initialWidth + diff);
      
      updateAttributes({ width: `${Math.round(newWidth)}px` });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, initialMousePosition, initialWidth, updateAttributes]);

  return (
    <NodeViewWrapper className={wrapperClass} style={wrapperStyle}>
      {selected && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-card border border-border shadow-md rounded-md flex items-center p-1 gap-1 z-50">
          <Button 
            type="button"
            variant={align === 'left' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={() => updateAttributes({ align: align === 'left' ? 'center' : 'left' })}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button 
            type="button"
            variant={align === 'center' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={() => updateAttributes({ align: align === 'center' ? 'center' : 'center' })}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button 
            type="button"
            variant={align === 'right' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={() => updateAttributes({ align: align === 'right' ? 'center' : 'right' })}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div 
        ref={wrapperRef}
        className={`relative w-full ${selected ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}
      >
        <div 
          className="relative w-full overflow-hidden rounded-lg"
          style={{ paddingBottom: '56.25%' /* 16:9 */ }}
        >
          <iframe
            src={src}
            className="absolute inset-0 w-full h-full rounded-lg"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`${platform === 'youtube' ? 'YouTube' : 'Vimeo'} video`}
          />
        </div>
        
        {selected && (
          <div 
            className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-primary border-2 border-background rounded-full cursor-nwse-resize z-10 hover:scale-125 transition-transform"
            onMouseDown={handleMouseDown}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
};

// ─── TipTap Node Extension ─────────────────────────────────────────────

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoEmbed: {
      /**
       * Insert a video embed node.
       */
      setVideoEmbed: (options: { src: string; platform: VideoPlatform }) => ReturnType;
    };
  }
}

export const VideoEmbed = Node.create({
  name: 'videoEmbed',

  group: 'block',

  atom: true, // not editable content inside

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          // When parsing from HTML, pull src from the inner iframe
          const iframe = element.querySelector('iframe');
          return iframe?.getAttribute('src') || element.getAttribute('data-video-src');
        },
        renderHTML: (attributes: Record<string, any>) => {
          return { 'data-video-src': attributes['src'] };
        },
      },
      platform: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          return element.getAttribute('data-video-platform');
        },
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes['platform']) return {};
          return { 'data-video-platform': attributes['platform'] };
        },
      },
      width: {
        default: '100%',
        parseHTML: (element: HTMLElement) => element.style.width || '100%',
        renderHTML: (attributes: Record<string, any>) => {
          return { 'data-width': attributes['width'] };
        }
      },
      align: {
        default: 'center',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes: Record<string, any>) => {
          return { 'data-align': attributes['align'] };
        }
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-video-embed]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    const src = HTMLAttributes['data-video-src'] as string;
    const platform = HTMLAttributes['data-video-platform'] as string;
    const align = HTMLAttributes['data-align'] as string;
    const width = HTMLAttributes['data-width'] as string;

    let style = `width: ${width}; clear: both; `;
    if (align === 'center') {
      style += 'display: block; margin-left: auto; margin-right: auto; ';
    } else if (align === 'left') {
      style += 'float: left; margin-right: 1rem; ';
    } else if (align === 'right') {
      style += 'float: right; margin-left: 1rem; ';
    }

    // Clean up internal data attributes
    delete HTMLAttributes['data-width'];

    // Outer wrapper div
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-video-embed': '',
        style: style.trim(),
      }),
      [
        'div',
        {
          style: 'position: relative; width: 100%; padding-bottom: 56.25%; overflow: hidden; border-radius: 0.5rem; margin: 1rem 0;',
        },
        [
          'iframe',
          {
            src,
            frameborder: '0',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            allowfullscreen: 'true',
            title: `${platform === 'youtube' ? 'YouTube' : 'Vimeo'} video`,
            style: 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 0.5rem;',
          },
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setVideoEmbed:
        (options: { src: string; platform: VideoPlatform }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoEmbedComponent);
  },
});
