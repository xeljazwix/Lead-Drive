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
      initialSelection: new Set()
    };

    const getSelectionRect = (e) => {
      const currentX = e.pageX;
      const currentY = e.pageY;
      return {
        left: Math.min(state.startX, currentX),
        top: Math.min(state.startY, currentY),
        width: Math.abs(currentX - state.startX),
        height: Math.abs(currentY - state.startY)
      };
    };

    const isIntersecting = (rect1, rect2) => {
      return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
      );
    };

    const handleMouseDown = (e) => {
      if (e.button !== 0) return; 
      
      const targetElement = e.target;
      if (targetElement.closest('[data-id]')) return;
      if (targetElement.closest('button')) return;
      if (targetElement.closest('a')) return;

      state.isDragging = true;
      state.startX = e.pageX;
      state.startY = e.pageY;
      
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        clearSelection();
        state.initialSelection = new Set();
      } else {
        state.initialSelection = new Set(selectedRef.current);
      }

      setBox({ left: state.startX, top: state.startY, width: 0, height: 0 });
      e.preventDefault(); 
    };

    const handleMouseMove = (e) => {
      if (!state.isDragging) return;

      const rect = getSelectionRect(e);
      setBox(rect);

      const clientLeft = Math.min(state.startX - window.scrollX, e.clientX);
      const clientTop = Math.min(state.startY - window.scrollY, e.clientY);
      const clientWidth = Math.abs(e.clientX - (state.startX - window.scrollX));
      const clientHeight = Math.abs(e.clientY - (state.startY - window.scrollY));
      
      const selectionClientRect = {
        left: clientLeft,
        top: clientTop,
        right: clientLeft + clientWidth,
        bottom: clientTop + clientHeight,
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
      
      // Update store directly or through a new action
      // Since we don't have a bulk setSelection action in driveStore, we can just call selectItem repeatedly? No, that causes renders.
      useDriveStore.setState({ selected: newSelectionIds });
    };

    const handleMouseUp = () => {
      if (state.isDragging) {
        state.isDragging = false;
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
    };
  }, [containerRef, clearSelection]);

  return box;
}
