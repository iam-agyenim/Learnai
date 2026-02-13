import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VisualLayer } from '@/types/learning';
import { cn } from '@/lib/utils';

interface VisualLayerProps {
  layer: VisualLayer;
  isActive: boolean;
}

export function VisualLayerRenderer({ layer, isActive }: VisualLayerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      const delay = layer.animation?.delay ?? 0;
      const timer = setTimeout(() => setIsVisible(true), delay);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isActive, layer.animation?.delay]);

  if (!isActive || !isVisible) {
    return null;
  }

  const position = layer.position || { x: 50, y: 50 };
  const style = layer.style || {};

  const getAnimationVariants = () => {
    switch (layer.animation?.type) {
      case 'fadeIn':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: layer.animation.duration ? layer.animation.duration / 1000 : 0.5 },
        };
      case 'slideIn':
        return {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: layer.animation.duration ? layer.animation.duration / 1000 : 0.5 },
        };
      case 'typing':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.3 },
        };
      case 'highlight':
        return {
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: layer.animation.duration ? layer.animation.duration / 1000 : 0.3 },
        };
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.3 },
        };
    }
  };

  const renderContent = () => {
    switch (layer.type) {
      case 'text':
        return (
          <div
            className="text-foreground"
            style={{
              fontSize: style.fontSize || '1rem',
              fontWeight: style.fontWeight || 'normal',
              color: style.color,
              textAlign: 'center' as const,
              ...style,
            }}
          >
            {layer.content}
          </div>
        );

      case 'code':
        return (
          <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm border border-border">
            <pre className="text-foreground whitespace-pre-wrap">
              {layer.content}
            </pre>
          </div>
        );

      case 'diagram':
        return (
          <div className="bg-muted/30 rounded-xl p-8 border-2 border-border/50">
            <div className="text-foreground/80 text-center">
              <div className="text-lg font-medium mb-2">{layer.content || 'Diagram'}</div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="h-20 bg-accent/20 rounded-lg flex items-center justify-center">
                  <span className="text-sm">Element 1</span>
                </div>
                <div className="h-20 bg-accent/20 rounded-lg flex items-center justify-center">
                  <span className="text-sm">Element 2</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'icon':
        return (
          <div className="text-4xl">
            {layer.content || '📚'}
          </div>
        );

      case 'animation':
        return (
          <div className="text-6xl animate-bounce">
            {layer.content || '✨'}
          </div>
        );

      case 'highlight':
        return (
          <div className="bg-accent/30 rounded-lg p-4 border-2 border-accent">
            <div className="text-foreground">{layer.content}</div>
          </div>
        );

      default:
        return <div className="text-foreground">{layer.content}</div>;
    }
  };

  const variants = getAnimationVariants();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '800px',
          }}
          initial={variants.initial}
          animate={variants.animate}
          exit={{ opacity: 0 }}
          transition={variants.transition}
        >
          {renderContent()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface VisualSceneProps {
  layers: VisualLayer[];
  isActive: boolean;
}

export function VisualScene({ layers, isActive }: VisualSceneProps) {
  return (
    <div className="relative w-full h-full">
      {layers.map((layer, index) => (
        <VisualLayerRenderer key={index} layer={layer} isActive={isActive} />
      ))}
    </div>
  );
}


