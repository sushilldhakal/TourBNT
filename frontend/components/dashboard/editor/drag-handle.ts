import { Extension } from '@tiptap/core';
import { NodeSelection, Plugin } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { DOMSerializer } from '@tiptap/pm/model';

export interface DragHandleOptions {
    /** The width of the drag handle */
    dragHandleWidth: number;
}

function absoluteRect(node: Element) {
    const data = node.getBoundingClientRect();
    const modal = node.closest('[role="dialog"]');

    // Check if editor is inside a modal/dialog with transforms
    if (modal && window.getComputedStyle(modal).transform !== 'none') {
        const modalRect = modal.getBoundingClientRect();
        return {
            top: data.top - modalRect.top,
            left: data.left - modalRect.left,
            width: data.width,
        };
    }

    return {
        top: data.top,
        left: data.left,
        width: data.width,
    };
}

function nodeDOMAtCoords(coords: { x: number; y: number }) {
    return document
        .elementsFromPoint(coords.x, coords.y)
        .find(
            (elem: Element) =>
                elem.parentElement?.matches?.('.ProseMirror') ||
                elem.matches(
                    [
                        'li',
                        'p:not(:first-child)',
                        'pre',
                        'blockquote',
                        'h1, h2, h3, h4, h5, h6',
                    ].join(', ')
                )
        );
}

function nodePosAtDOM(node: Element, view: EditorView) {
    const boundingRect = node.getBoundingClientRect();

    return view.posAtCoords({
        left: boundingRect.left + 1,
        top: boundingRect.top + 1,
    })?.inside;
}

function DragHandle(options: DragHandleOptions) {
    function handleDragStart(event: DragEvent, view: EditorView) {
        view.focus();

        if (!event.dataTransfer) return;

        const node = nodeDOMAtCoords({
            x: event.clientX + 50 + options.dragHandleWidth,
            y: event.clientY,
        });

        if (!(node instanceof Element)) return;

        const nodePos = nodePosAtDOM(node, view);
        if (nodePos == null || nodePos < 0) return;

        view.dispatch(
            view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos))
        );

        const slice = view.state.selection.content();

        // Serialize the slice for clipboard
        const fragment = slice.content;
        const serializer = DOMSerializer.fromSchema(view.state.schema);
        const dom = serializer.serializeFragment(fragment);

        // Create a temporary container to get HTML string
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(dom);
        const htmlContent = tempDiv.innerHTML;

        // Get plain text content
        const textContent = tempDiv.textContent || '';

        event.dataTransfer.clearData();
        event.dataTransfer.setData('text/html', htmlContent);
        event.dataTransfer.setData('text/plain', textContent);
        event.dataTransfer.effectAllowed = 'copyMove';
        event.dataTransfer.setDragImage(node, 0, 0);

        view.dragging = { slice, move: event.ctrlKey };
    }

    function handleClick(event: MouseEvent, view: EditorView) {
        view.focus();

        view.dom.classList.remove('dragging');

        const node = nodeDOMAtCoords({
            x: event.clientX + 50 + options.dragHandleWidth,
            y: event.clientY,
        });

        if (!(node instanceof Element)) return;

        const nodePos = nodePosAtDOM(node, view);
        if (!nodePos) return;

        view.dispatch(
            view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos))
        );
    }

    let dragHandleElement: HTMLElement | null = null;

    function hideDragHandle() {
        if (dragHandleElement) {
            dragHandleElement.classList.add('hide');
        }
    }

    function showDragHandle() {
        if (dragHandleElement) {
            dragHandleElement.classList.remove('hide');
        }
    }

    return new Plugin({
        view: (view) => {
            dragHandleElement = document.createElement('div');
            dragHandleElement.draggable = true;
            dragHandleElement.dataset.dragHandle = '';
            dragHandleElement.classList.add('drag-handle');
            dragHandleElement.addEventListener('dragstart', (e) => {
                handleDragStart(e, view);
            });
            dragHandleElement.addEventListener('click', (e) => {
                handleClick(e, view);
            });

            hideDragHandle();

            view?.dom?.parentElement?.appendChild(dragHandleElement);

            return {
                destroy: () => {
                    dragHandleElement?.remove?.();
                    dragHandleElement = null;
                },
            };
        },
        props: {
            handleDOMEvents: {
                mousemove: (view, event) => {
                    if (!view.editable) {
                        return;
                    }

                    const node = nodeDOMAtCoords({
                        x: event.clientX + 50 + options.dragHandleWidth,
                        y: event.clientY,
                    });

                    if (!(node instanceof Element) || node.matches('ul, ol')) {
                        hideDragHandle();
                        return;
                    }

                    const compStyle = window.getComputedStyle(node);
                    const lineHeight = parseInt(compStyle.lineHeight, 10);
                    const paddingTop = parseInt(compStyle.paddingTop, 10);

                    // Get the editor container for relative positioning
                    const editorContainer = view.dom.parentElement;
                    if (!editorContainer || !dragHandleElement) return;

                    const containerRect = editorContainer.getBoundingClientRect();
                    const nodeRect = node.getBoundingClientRect();

                    // Calculate position relative to the editor container
                    let topPosition = nodeRect.top - containerRect.top;
                    let leftPosition = nodeRect.left - containerRect.left;

                    // Center vertically within the line
                    topPosition += (lineHeight - 24) / 2;
                    topPosition += paddingTop;

                    // Position to the left of the content with a small gap
                    leftPosition -= options.dragHandleWidth + 4; // 4px gap

                    // Adjust for list markers
                    if (node.matches('ul:not([data-type=taskList]) li, ol li')) {
                        leftPosition -= options.dragHandleWidth;
                    }

                    // Ensure it stays within the container (at least 4px from edge)
                    leftPosition = Math.max(4, leftPosition);

                    dragHandleElement.style.left = `${leftPosition}px`;
                    dragHandleElement.style.top = `${topPosition}px`;
                    showDragHandle();
                },
                keydown: () => {
                    hideDragHandle();
                },
                mousewheel: () => {
                    hideDragHandle();
                },
                // dragging class is used for CSS
                dragstart: (view) => {
                    view.dom.classList.add('dragging');
                },
                drop: (view) => {
                    view.dom.classList.remove('dragging');
                },
                dragend: (view) => {
                    view.dom.classList.remove('dragging');
                },
            },
        },
    });
}

interface DragAndDropOptions {
    dragHandleWidth?: number;
}

export const DragAndDrop = Extension.create<DragAndDropOptions>({
    name: 'dragAndDrop',

    addOptions() {
        return {
            dragHandleWidth: 24,
        };
    },

    addProseMirrorPlugins() {
        return [
            DragHandle({
                dragHandleWidth: this.options.dragHandleWidth ?? 24,
            }),
        ];
    },
});
