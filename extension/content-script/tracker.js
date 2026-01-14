if (!window.CSSPicker) window.CSSPicker = {};

window.CSSPicker.ElementChangeTracker = class ElementChangeTracker {
    constructor() {
        this.changes = new WeakMap(); // store original values: element -> { prop: originalValue }
    }

    /**
     * Track and apply a style change to an element
     * @param {HTMLElement} element 
     * @param {string} property 
     * @param {string} value 
     */
    applyChange(element, property, value) {
        if (!element) return false;

        // 1. Initialize tracking for this element if needed
        if (!this.changes.has(element)) {
            this.changes.set(element, {});
        }
        const elementChanges = this.changes.get(element);

        // 2. Save original value if not already saved
        // We only save the VERY first value we encountered before ANY of our changes
        // This allows correct "Reset" behavior even after multiple edits
        // Note: We need to use computed style or inline style? 
        // Ideally inline style is what we overwrite. If inline style was empty, we save empty.
        // If we want to revert to *computed* style, that's trickier because removing inline style reveals computed.
        // So saving the original INLINE style is usually correct for "undoing" local edits.
        if (!(property in elementChanges)) {
            elementChanges[property] = element.style.getPropertyValue(property); // Save inline style
        }

        // 3. Apply the change
        // We use !important to ensure it overrides existing classes
        if (value === null || value === undefined || value === '') {
            // If clearing, we might want to restore original or just remove property
            // For now, let's remove property
            element.style.removeProperty(property);
        } else {
            // Handle special cases
            if (property === 'display' && value === 'grid') {
                // Force cleanup if switching display types? 
            }

            element.style.setProperty(property, value, 'important');
        }

        // 4. Force Reflow for Layout Properties
        // Grid/Flex changes sometimes don't visually update immediately in complex layouts
        if (['gridTemplateColumns', 'gridTemplateRows', 'gap', 'display'].includes(property)) {
            // Trigger reflow
            void element.offsetHeight;
        }

        return true;
    }

    /**
     * Revert a specific property to its state before we touched it
     */
    revertChange(element, property) {
        if (!element || !this.changes.has(element)) return;

        const elementChanges = this.changes.get(element);
        if (property in elementChanges) {
            const original = elementChanges[property];
            if (original) {
                element.style.setProperty(property, original); // Restore original inline
                // Check if it had important priority originally? 
                // getPropertyValue doesn't give priority. 
                // Ideally we should track priority too but for MVP this is okay.
            } else {
                element.style.removeProperty(property);
            }
            // We can optionally remove it from tracking if we want "reset" to mean "forgotten"
            // delete elementChanges[property];
        }
    }

    getOriginalValue(element, property) {
        if (!element || !this.changes.has(element)) return null;
        return this.changes.get(element)[property];
    }

    /**
     * Get all original values for an element
     */
    getAllOriginals(element) {
        if (!element || !this.changes.has(element)) return {};
        return { ...this.changes.get(element) };
    }
}
