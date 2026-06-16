import { useEffect, useState, useRef } from 'react';
import { useDriveStore } from '../store/drive.store.js';

export function useDragSelect(containerRef, itemsList) {
  const { selectItem, clearSelection, selected } = useDriveStore();
  const [box, setBox] = useState(null);
  
  // To keep track of the latest selected set during drag
  const selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const state = {
      isDragging: false,
      startX: 0,
      startY: 0,
      currentClientX: 0,
      currentClientY: 0,
      initialSelection: new Set(),
      animationFrameId: null
    };

    const SCROLL_ZONE_HEIGHT = 80;
    const MAX_SCROLL_SPEED = 30;

    const isIntersecting = (rect1, rect2) => {
      return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
      );
    };

    const updateLoop = () => {
      if (!state.isDragging) return;

      let scrollDelta = 0;
      const { innerHeight } = window;
      const { currentClientY } = state;

      // Auto-scrolling calculation: speed increases the closer to the edge
      if (currentClientY < SCROLL_ZONE_HEIGHT) {
        const ratio = 1 - (Math.max(0, currentClientY) / SCROLL_ZONE_HEIGHT);
        scrollDelta = -(Math.max(1, ratio * MAX_SCROLL_SPEED));
      } else if (currentClientY > innerHeight - SCROLL_ZONE_HEIGHT) {
        const dist = innerHeight - currentClientY;
        const ratio = 1 - (Math.max(0, dist) / SCROLL_ZONE_HEIGHT);
        scrollDelta = Math.max(1, ratio * MAX_SCROLL_SPEED);
      }

      // Find scroll parent
      const scrollParent = container.closest('main') || document.documentElement;

      if (scrollDelta !== 0) {
        scrollParent.scrollBy(0, scrollDelta);
      }

      // Since the box is rendered with position: fixed, we can just use client coordinates directly!
      // But we must accumulate the scroll delta into the box's perceived end position.
      // Wait, if the scroll parent scrolls, the mouse physically doesn't move, so currentClientY stays the same, 
      // but the start position moves UP relative to the viewport!
      // So the start coordinates should be stored relative to the document (or scroll parent),
      // and we convert them to client coordinates for rendering.
      
      const scrollY = scrollParent.scrollTop || window.scrollY;
      const scrollX = scrollParent.scrollLeft || window.scrollX;

      const currentX = state.currentClientX + scrollX;
      const currentY = state.currentClientY + scrollY;

      const left = Math.min(state.startX, currentX);
      const top = Math.min(state.startY, currentY);
      const width = Math.abs(currentX - state.startX);
      const height = Math.abs(currentY - state.startY);

      const clientLeft = left - scrollX;
      const clientTop = top - scrollY;

      setBox(prev => {
        if (prev && prev.left === clientLeft && prev.top === clientTop && prev.width === width && prev.height === height) return prev;
        return { left: clientLeft, top: clientTop, width, height };
      });
      
      const selectionClientRect = {
        left: clientLeft,
        top: clientTop,
        right: clientLeft + width,
        bottom: clientTop + height,
      };

      const elements = container.querySelectorAll('[data-id]');
      const newSelectionIds = new Set(state.initialSelection);
      
      elements.forEach(el => {
        const id = el.getAttribute('data-id');
        const elRect = el.getBoundingClientRect();
        if (isIntersecting(selectionClientRect, elRect)) {
          newSelectionIds.add(id);
        }
      });
      
      useDriveStore.setState(prev => {
        if (prev.selected.size === newSelectionIds.size && [...prev.selected].every(id => newSelectionIds.has(id))) {
          return prev;
        }
        return { selected: newSelectionIds };
      });

      state.animationFrameId = requestAnimationFrame(updateLoop);
    };

    const handleMouseDown = (e) => {
      if (e.button !== 0) return; 
      
      const targetElement = e.target;
      if (targetElement.closest('[data-id]')) return;
      if (targetElement.closest('button')) return;
      if (targetElement.closest('a')) return;

      const scrollParent = container.closest('main') || document.documentElement;
      const scrollY = scrollParent.scrollTop || window.scrollY;
      const scrollX = scrollParent.scrollLeft || window.scrollX;

      state.isDragging = true;
      state.currentClientX = e.clientX;
      state.currentClientY = e.clientY;
      state.startX = e.clientX + scrollX;
      state.startY = e.clientY + scrollY;
      
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        clearSelection();
        state.initialSelection = new Set();
      } else {
        state.initialSelection = new Set(selectedRef.current);
      }

      setBox({ left: state.currentClientX, top: state.currentClientY, width: 0, height: 0 });
      e.preventDefault(); 
      
      state.animationFrameId = requestAnimationFrame(updateLoop);
    };

    const handleMouseMove = (e) => {
      if (!state.isDragging) return;
      state.currentClientX = e.clientX;
      state.currentClientY = e.clientY;
    };

    const handleMouseUp = () => {
      if (state.isDragging) {
        state.isDragging = false;
        if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
        setBox(null);
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
    };
  }, [containerRef, clearSelection]);

  return box;
}
