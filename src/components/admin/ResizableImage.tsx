import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ResizableImageComponent = (props: any) => {
  const { node, updateAttributes, selected } = props;
  const { src, alt, title, width, height, align } = node.attrs;
  
  const imageRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [initialSize, setInitialSize] = useState({ w: 0, h: 0 });
  const [initialMousePosition, setInitialMousePosition] = useState(0);

  // Styling based on alignment
  let wrapperClass = 'relative inline-block my-4';
  let imageStyle: React.CSSProperties = { 
    width: width ? `${width}px` : 'auto', 
    height: height ? `${height}px` : 'auto',
    maxWidth: '100%' 
  };

  if (align === 'center') {
    wrapperClass = 'relative block mx-auto my-4 text-center';
  } else if (align === 'left') {
    wrapperClass = 'relative inline-block float-left mr-4 my-2';
  } else if (align === 'right') {
    wrapperClass = 'relative inline-block float-right ml-4 my-2';
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!imageRef.current) return;
    
    setIsResizing(true);
    setInitialMousePosition(e.clientX);
    setInitialSize({
      w: imageRef.current.clientWidth,
      h: imageRef.current.clientHeight
    });
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const diff = e.clientX - initialMousePosition;
      const newWidth = Math.max(50, initialSize.w + diff);
      // Maintain aspect ratio
      const ratio = initialSize.h / initialSize.w;
      const newHeight = newWidth * ratio;
      
      updateAttributes({ width: Math.round(newWidth), height: Math.round(newHeight) });
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
  }, [isResizing, initialMousePosition, initialSize, updateAttributes]);

  return (
    <NodeViewWrapper className={wrapperClass}>
      {selected && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-card border border-border shadow-md rounded-md flex items-center p-1 gap-1 z-50">
          <Button 
            type="button"
            variant={align === 'left' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={() => updateAttributes({ align: align === 'left' ? null : 'left' })}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button 
            type="button"
            variant={align === 'center' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={() => updateAttributes({ align: align === 'center' ? null : 'center' })}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button 
            type="button"
            variant={align === 'right' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={() => updateAttributes({ align: align === 'right' ? null : 'right' })}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className={`relative inline-block ${selected ? 'ring-2 ring-primary ring-offset-2 rounded-sm' : ''}`}>
        <img 
          ref={imageRef}
          src={src} 
          alt={alt} 
          title={title} 
          style={imageStyle} 
          className="rounded-md"
        />
        
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

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        }
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        }
      },
      align: {
        default: null,
        parseHTML: element => element.getAttribute('data-align'),
        renderHTML: attributes => {
          if (!attributes.align) return {};
          return { 'data-align': attributes.align };
        }
      }
    };
  },

  renderHTML({ HTMLAttributes }) {
    // Generate inline styles for rendering outside the editor
    let style = '';
    if (HTMLAttributes.width) style += `width: ${HTMLAttributes.width}px; `;
    if (HTMLAttributes.height) style += `height: ${HTMLAttributes.height}px; `;
    
    if (HTMLAttributes['data-align'] === 'center') {
      style += 'display: block; margin-left: auto; margin-right: auto; ';
    } else if (HTMLAttributes['data-align'] === 'left') {
      style += 'float: left; margin-right: 1rem; ';
    } else if (HTMLAttributes['data-align'] === 'right') {
      style += 'float: right; margin-left: 1rem; ';
    }

    if (style) {
      HTMLAttributes.style = style.trim();
    }

    return ['img', HTMLAttributes];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  }
});
