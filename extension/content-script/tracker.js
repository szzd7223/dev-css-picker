if (!window.Picky_Editor) window.Picky_Editor = {};

window.Picky_Editor.ElementChangeTracker = class ElementChangeTracker {
    constructor() {
        this.changes = new WeakMap(); // store original values: element -> { prop: originalValue }
    }

    /**
     * Track and apply a style change to an element
     * @param {HTMLElement} element 
     * @param {string} property 
     * @param {string} value 
     */
    /**
     * Helper to convert camelCase to kebab-case
     */
    camelToKebab(string) {
        return string.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * Track and apply a style change to an element
     * Supports both (element, prop, value) and (element, stylesDict)
     */
    applyChange(element, propertyOrStyles, value) {
        if (!element) return false;

        // Normalize input to dictionary
        let styles = {};
        if (typeof propertyOrStyles === 'object') {
            styles = propertyOrStyles;
        } else {
            styles = { [propertyOrStyles]: value };
        }

        // 1. Initialize tracking
        if (!this.changes.has(element)) {
            this.changes.set(element, {});
        }
        const elementChanges = this.changes.get(element);

        for (const [rawProp, val] of Object.entries(styles)) {
            const prop = this.camelToKebab(rawProp);

            // 2. Save original value if not already saved
            // 2. Save original value if not already saved
            if (!(prop in elementChanges)) {
                elementChanges[prop] = element.style.getPropertyValue(prop);
            }

            // 3. Apply the change
            if (val === null || val === undefined || val === '') {
                element.style.removeProperty(prop);
            } else {
                element.style.setProperty(prop, val, 'important');

                // 4. Force Reflow for Layout Properties
                if (['grid-template-columns', 'grid-template-rows', 'gap', 'display'].includes(prop)) {
                    void element.offsetHeight;
                }
            }
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
