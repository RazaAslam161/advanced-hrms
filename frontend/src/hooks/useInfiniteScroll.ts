import { useEffect, useRef } from 'react';

export const useInfiniteScroll = (onIntersect: () => void) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = ref.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          onIntersect();
        }
      });
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [onIntersect]);

  return ref;
};
