'use client';

import { useMemo } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import AutoScroll from 'embla-carousel-auto-scroll';

export { CarouselContent, CarouselItem, CarouselPrevious, CarouselNext };
export type { CarouselApi } from '@/components/ui/carousel';

type AutoplayOptions = Parameters<typeof Autoplay>[0];
type AutoScrollOptions = Parameters<typeof AutoScroll>[0];

type CarouselWithPluginsProps = React.ComponentProps<typeof Carousel> & {
  autoplayConfig?: AutoplayOptions | false;
  autoScrollConfig?: AutoScrollOptions;
};

/** Carousel with Autoplay (and optional AutoScroll) – all in one chunk with embla. */
export function CarouselWithPlugins({
  setApi,
  opts,
  className,
  orientation,
  autoplayConfig = { delay: 5000 },
  autoScrollConfig,
  children,
  ...rest
}: CarouselWithPluginsProps) {
  const plugins = useMemo(() => {
    const p: React.ComponentProps<typeof Carousel>['plugins'] = [];
    if (autoplayConfig !== false) p.push(Autoplay(autoplayConfig));
    if (autoScrollConfig) p.push(AutoScroll(autoScrollConfig));
    return p;
  }, [autoplayConfig, autoScrollConfig]);

  return (
    <Carousel
      setApi={setApi}
      opts={opts}
      className={className}
      orientation={orientation}
      plugins={plugins}
      {...rest}
    >
      {children}
    </Carousel>
  );
}
