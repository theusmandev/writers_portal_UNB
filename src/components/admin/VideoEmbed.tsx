import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';

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
  const { node, selected } = props;
  const { src, platform } = node.attrs;

  return (
    <NodeViewWrapper className="my-4">
      <div
        className={`relative w-full overflow-hidden rounded-lg ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
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

    // Outer wrapper div
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-video-embed': '',
        style:
          'position:relative;width:100%;padding-bottom:56.25%;overflow:hidden;border-radius:0.5rem;margin:1rem 0;',
      }),
      [
        'iframe',
        {
          src,
          frameborder: '0',
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowfullscreen: 'true',
          title: `${platform === 'youtube' ? 'YouTube' : 'Vimeo'} video`,
          style:
            'position:absolute;top:0;left:0;width:100%;height:100%;border-radius:0.5rem;',
        },
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
