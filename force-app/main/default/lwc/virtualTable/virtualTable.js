/* eslint-disable no-unused-expressions */
/* eslint-disable @lwc/lwc/no-async-operation */
import { LightningElement, track, api } from 'lwc';

/**
 * @class VirtualTable
 * @extends LightningElement
 * @description A virtualized data table component that efficiently renders large datasets
 * by only displaying rows that are currently visible in the viewport
 */
export default class VirtualTable extends LightningElement {
    /**
     * @typedef {Object} UnreactiveProps
     * @property {Object} _modifiedDataCache - Cache for modified row data
     * @property {Object} _selectedRows - Currently selected rows
     * @property {boolean} _allRowsSelected - Flag indicating if all rows are selected
     * @property {number} _scrollTop - Current scroll position
     * @property {Array} _columns - Table columns configuration
     * @property {Array} allData - Complete dataset for the table
     * @property {number} rowHeight - Height of each table row
     * @property {number} nodePadding - Padding for virtual rendering
     * @property {number} viewportHeight - Height of the visible area
     * @property {Set} _selectedRowsKey - Set of selected row keys
     * @property {number} rafIdIntersectionObserver - RequestAnimationFrame ID for intersection observer
     * @property {number} scrollTimeout - Timeout ID for scroll handling
     * @property {Object} resizing - Object containing resizing state
     * @property {boolean} tableResizeObserved - Flag indicating if table resize observer is observed
     * @property {boolean} columnResizeObserved - Flag indicating if column resize observer is observed
     * @property {ResizeObserver} resizeObserver - Resize observer for table
     * @property {number} resizeObserverFrameId - RequestAnimationFrame ID for resize observer
     * @property {number} resizeObserverColumnHeaderFrameId - RequestAnimationFrame ID for column resize observer
     * @property {ResizeObserver} resizeObserverColumnHeader - Resize observer for column header
     */

    /**
     * @type {UnreactiveProps}
     */
    _unreactiveProp = {
        _modifiedDataCache: {},
        _selectedRows: {},
        _allRowsSelected: false,
        _scrollTop: 0,
        _columns: [],
        allData: [],
        rowHeight: 40,
        nodePadding: 10,
        viewportHeight: 400,
        _selectedRowsKey: new Set(),
        rafIdIntersectionObserver: null,
        scrollTimeout: 0,
        resizing: null,
        tableResizeObserved: false,
        columnResizeObserved: false,
        resizeObserver: null,
        resizeObserverFrameId: null,
        resizeObserverColumnHeaderFrameId: null,
        resizeObserverColumnHeader: null
    };

    /**
     * @api
     * @description Label for the datatable
     * @type {string}
     * @default 'Datatable'
     */
    @api label = 'Datatable';

    /**
     * @api
     * @description Flag indicating if row selection is allowed
     * @type {boolean}
     * @default false
     */
    @api allowRowSelection = false;

    /**
     * @api
     * @description Field name to use as the unique key for each row
     * @type {string}
     */
    @api keyField;

    /**
     * @api
     * @description Get the columns configuration
     * @returns {Array} Array of column configuration objects
     */
    @api get columns() {
        return this._unreactiveProp._columns || [];
    }

    /**
     * @api
     * @description Set the columns configuration
     * @param {Array} value - Array of column configuration objects
     */
    set columns(value) {
        this._unreactiveProp._columns = value;
        this.processColumns();
    }

    /**
     * @api
     * @description Get the row data
     * @returns {Array} Array of data rows
     */
    @api
    get rowData() {
        return this._unreactiveProp.allData;
    }

    /**
     * @api
     * @description Set the row data
     * @param {Array} value - Array of data rows
     */
    set rowData(value) {
        // Reset table state when data changes
        this._unreactiveProp._modifiedDataCache = {};
        this._unreactiveProp._selectedRows = {};
        this._unreactiveProp._selectedRowsKey = new Set();
        this._unreactiveProp._allRowsSelected = false;
        this._unreactiveProp._scrollTop = 0;

        // Set the new data
        this._unreactiveProp.allData = value || [];

        // Update the view
        this.updateVisibleData();
    }

    /**
     * @description Gets the selected row keys
     * @returns {Object} Returns 'allRows' if all rows are selected, otherwise returns a Set of selected row keys
     */
    @api getSelectedRowsKeys() {
        if (!this.allowRowSelection) {
            return {
                event: 'selectedRowsKeys',
                data: new Set()
            };
        }
        if (this._unreactiveProp._allRowsSelected) {
            return {
                event: 'allRowsSelected',
                data: new Set()
            };
        }

        return {
            event: 'selectedRowsKeys',
            data: this._unreactiveProp._selectedRowsKey
        };
    }

    /**
     * @api
     * @description Set the selected row keys
     * @param {Array} value - Array of row keys to be selected
     */
    @api
    set selectedRowsKeys(value) {
        // Reset selection state
        this._unreactiveProp._selectedRows = {};
        this._unreactiveProp._allRowsSelected = false;

        // Set new selected keys
        if (value) {
            this._unreactiveProp._selectedRowsKey = new Set(JSON.parse(JSON.stringify(value)));
        } else {
            this._unreactiveProp._selectedRowsKey = new Set();
        }

        // Update the selection state in the modified data cache
        if (this._unreactiveProp._modifiedDataCache) {
            const keys = Object.keys(this._unreactiveProp._modifiedDataCache);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const row = this._unreactiveProp._modifiedDataCache[key];
                const isSelected = this._unreactiveProp._selectedRowsKey.has(key);

                // Update selection state
                row.isSelected = isSelected;

                // Add to selected rows if selected
                if (isSelected) {
                    this._unreactiveProp._selectedRows[key] = row;
                }
            }
        }

        // Update visible data to reflect selection changes
        this.updateVisibleData();
    }

    /**
     * @api
     * @description Set the row height
     * @param {number} value - Height of each row in pixels
     */
    @api
    set rowHeight(value) {
        this._unreactiveProp.rowHeight = value;
    }

    /**
     * @description Get the row height
     * @returns {number} Height of each row in pixels
     */
    get rowHeight() {
        return this._unreactiveProp.rowHeight;
    }

    /**
     * @description Get the selected row keys
     * @returns {Set} Set of selected row keys
     */
    get selectedRowsKeys() {
        return this._unreactiveProp._selectedRowsKey;
    }

    /**
     * @track
     * @description Array of visible data rows currently rendered in the viewport
     * @type {Array}
     */
    @track visibleData = [];

    /**
     * @description Processes the columns configuration to ensure required properties
     * @returns {void}
     */
    processColumns() {
        if (!this._unreactiveProp._columns) return;

        this.processedColumns = this._unreactiveProp._columns.map((column) => ({
            ...column,
            key: column.fieldName || column.label,
            type: column.type || 'text'
        }));
    }

    /**
     * @description Calculates the total content height for the vertical scrolling
     * @returns {number} Total height of all content in pixels
     */
    get totalContentHeight() {
        return Math.max(
            this._unreactiveProp.allData.length * this._unreactiveProp.rowHeight,
            this._unreactiveProp.viewportHeight || 0
        );
    }

    /**
     * @description Get the current scroll position
     * @returns {number} Current scroll position in pixels
     */
    get scrollTop() {
        return this._unreactiveProp._scrollTop || 0;
    }

    /**
     * @description Calculate the index of the first row to render based on scroll position
     * @returns {number} Index of the first visible row
     */
    get startNode() {
        let start = Math.floor(this.scrollTop / this._unreactiveProp.rowHeight) - this._unreactiveProp.nodePadding;
        return Math.max(0, start);
    }

    /**
     * @description Calculate the number of nodes (rows) to render in the viewport
     * @returns {number} Number of rows to render
     */
    get visibleNodesCount() {
        let count =
            Math.ceil(this._unreactiveProp.viewportHeight / this._unreactiveProp.rowHeight) +
            4 * this._unreactiveProp.nodePadding;
        return Math.min(this._unreactiveProp.allData.length - this.startNode, count);
    }

    /**
     * @description Calculate the Y offset for positioning the visible rows
     * @returns {number} Y offset in pixels
     */
    get offsetY() {
        return this.startNode * this._unreactiveProp.rowHeight;
    }

    /**
     * @description Generate CSS style for the content container
     * @returns {string} CSS style string
     */
    get contentStyle() {
        return `height: ${this.totalContentHeight}px; position: relative;`;
    }

    /**
     * @description Generate CSS style for the offset container
     * @returns {string} CSS style string
     */
    get offsetStyle() {
        return `transform: translateY(${this.offsetY}px); position: absolute; width: 100%;`;
    }

    /**
     * @description Generate CSS style for row height
     * @returns {string} CSS style string for row height
     */
    get rowHeightStyle() {
        return `height: ${this._unreactiveProp.rowHeight}px;`;
    }

    /**
     * @description Lifecycle hook called when component is inserted into the DOM
     * @returns {void}
     */
    connectedCallback() {
        this.updateVisibleData();
    }

    /**
     * @description Handles scroll events and updates visible data when necessary
     * @param {Event} event - The scroll event
     * @returns {void}
     */
    handleScroll(event) {
        if (this._unreactiveProp.scrollTimeout) {
            window.cancelAnimationFrame(this._unreactiveProp.scrollTimeout);
        }
        let scrollTop = event?.target?.scrollTop;

        this._unreactiveProp.scrollTimeout = window.requestAnimationFrame(() => {
            if (
                this.scrollTop === scrollTop ||
                Math.abs((this._unreactiveProp._scrollTop || 0) - scrollTop) < 9 * this._unreactiveProp.rowHeight
            ) {
                return;
            }
            this._unreactiveProp._scrollTop = scrollTop;
            this.updateVisibleData();
        });
    }

    /**
     * @description Lifecycle hook called when component is removed from the DOM
     * @returns {void}
     */
    disconnectedCallback() {
        if (this._unreactiveProp.scrollTimeout) {
            window.cancelAnimationFrame(this._unreactiveProp.scrollTimeout);
        }
    }

    /**
     * @description Updates the visible data based on current scroll position and viewport
     * @returns {void}
     */
    updateVisibleData() {
        const endNode = Math.min(this.startNode + this.visibleNodesCount, this._unreactiveProp.allData.length);
        this.visibleData = this._unreactiveProp.allData.slice(this.startNode, endNode).map((row, index) => {
            let key = row[this.keyField] || row.id || index;
            let modifiedRow = this._unreactiveProp._modifiedDataCache[key];
            if (modifiedRow) {
                if (this.allowRowSelection) {
                    const shouldBeSelected = this._unreactiveProp._allRowsSelected || this.selectedRowsKeys.has(key);

                    if (modifiedRow.isSelected !== shouldBeSelected) {
                        modifiedRow.isSelected = shouldBeSelected;

                        if (shouldBeSelected) {
                            this._unreactiveProp._selectedRowsKey.add(key);
                            this._unreactiveProp._selectedRows[key] = modifiedRow;
                        } else {
                            this._unreactiveProp._selectedRowsKey.delete(key);
                            delete this._unreactiveProp._selectedRows[key];
                        }
                    }
                }
                return modifiedRow;
            }

            modifiedRow = { ...row };

            if (this.allowRowSelection) {
                const shouldBeSelected =
                    this._unreactiveProp._allRowsSelected || this._unreactiveProp._selectedRowsKey.has(key);
                modifiedRow.isSelected = shouldBeSelected;

                if (shouldBeSelected) {
                    this._unreactiveProp._selectedRowsKey.add(key);
                    this._unreactiveProp._selectedRows[key] = modifiedRow;
                }
            }

            modifiedRow.key = key;
            modifiedRow.index = this.startNode + index + 1;
            modifiedRow.flattenedColumns = this.processedColumns?.map((column) => {
                const typeAttributes = { ...column.typeAttributes };

                if (typeAttributes) {
                    const keys = Object.keys(typeAttributes);
                    for (let i = 0; i < keys.length; i++) {
                        const attr = keys[i];
                        if (typeAttributes[attr]?.fieldName) {
                            typeAttributes[attr] = modifiedRow[typeAttributes[attr].fieldName];
                        }
                    }
                }

                return {
                    ...column,
                    value: modifiedRow[column.fieldName],
                    typeAttributes: typeAttributes,
                    key: `${key}-${column.fieldName}`
                };
            });
            modifiedRow.processed = true;

            this._unreactiveProp._modifiedDataCache[key] = modifiedRow;

            return modifiedRow;
        });
    }

    /**
     * @description Lifecycle hook called after component rendering is complete
     * Sets up resize observers and initializes component
     * @returns {void}
     */
    renderedCallback() {
        if (!this.hasInitialized) {
            const container = this.template.querySelector('.table-container');
            if (container) {
                this._unreactiveProp.viewportHeight = container.getBoundingClientRect().height;
                this.hasInitialized = true;
                this.updateVisibleData();
            }
        }

        this.observeTableResize();
        this.observeColumnResize();
    }

    /**
     * @description Observes the table resize
     * @returns {void}
     */
    observeTableResize() {
        if (!this._unreactiveProp.tableResizeObserved) {
            // eslint-disable-next-line no-unused-vars
            this._unreactiveProp.resizeObserver = new ResizeObserver((entries) => {
                if (this._unreactiveProp.resizeObserverFrameId) {
                    window.cancelAnimationFrame(this._unreactiveProp.resizeObserverFrameId);
                }
                this._unreactiveProp.resizeObserverFrameId = window.requestAnimationFrame(() => {
                    let defaultHeaderCell = this.template.querySelectorAll('th');
                    let customHeaderCell = this.template.querySelectorAll('.custom-header-cell');

                    let maxHeight = 0;
                    for (let i = 0; i < customHeaderCell.length; i++) {
                        const height = customHeaderCell[i].getBoundingClientRect().height;
                        maxHeight = Math.max(maxHeight, height);
                    }

                    for (let index = 0; index < defaultHeaderCell.length; index++) {
                        const element = customHeaderCell[index];
                        if (element) {
                            const width = defaultHeaderCell[index].getBoundingClientRect().width;
                            element.style.width = `${width}px`;
                            element.style.height = `${maxHeight}px`;
                        }
                    }
                });
            });

            let table = this.template.querySelector('table');
            if (table) {
                this._unreactiveProp.resizeObserver.observe(table);
                this._unreactiveProp.tableResizeObserved = true;
            }
        }
    }

    /**
     * @description Observes the column resize
     * @returns {void}
     */
    observeColumnResize() {
        if (!this._unreactiveProp.columnResizeObserved) {
            if (this._unreactiveProp.resizeObserverColumnHeaderFrameId) {
                window.cancelAnimationFrame(this._unreactiveProp.resizeObserverColumnHeaderFrameId);
            }
            this._unreactiveProp.resizeObserverColumnHeaderFrameId = window.requestAnimationFrame(() => {
                this._unreactiveProp.resizeObserverColumnHeader = new ResizeObserver((thHeaderCell) => {
                    let customHeaderCell = this.template.querySelectorAll('.custom-header-cell');
                    let keyVsCustomColumnMap = {};
                    for (let index = 0; index < customHeaderCell.length; index++) {
                        let key = customHeaderCell[index].attributes?.getNamedItem('data-columnkey')?.value;
                        if (key) {
                            keyVsCustomColumnMap[key] = customHeaderCell[index];
                        }
                    }

                    for (let index = 0; index < thHeaderCell.length; index++) {
                        let element = thHeaderCell[index].target;
                        let key = element.attributes?.getNamedItem('data-columnkey')?.value;
                        let customColumn = keyVsCustomColumnMap[key];
                        if (customColumn) {
                            customColumn.style.width = `${element.getBoundingClientRect().width}px`;
                        }
                    }
                });
                let defaultHeaderCell = this.template.querySelectorAll('th');
                if (defaultHeaderCell && defaultHeaderCell.length > 0) {
                    for (let index = 0; index < defaultHeaderCell.length; index++) {
                        this._unreactiveProp.resizeObserverColumnHeader.observe(defaultHeaderCell[index]);
                    }
                    this._unreactiveProp.columnResizeObserved = true;
                }
            });
        }
    }

    /**
     * @description Handles selection of individual rows
     * @param {Event} event - The selection event
     * @returns {void}
     */
    handleRowSelection(event) {
        const rowKey = event?.target?.dataset?.row;
        this._unreactiveProp._allRowsSelected = false;
        let currentRow = this._unreactiveProp._modifiedDataCache[rowKey];
        if (event?.target?.checked) {
            currentRow.isSelected = true;
            this._unreactiveProp._selectedRowsKey.add(rowKey);
            this._unreactiveProp._selectedRows[rowKey] = currentRow;
        } else {
            currentRow.isSelected = false;
            this._unreactiveProp._selectedRowsKey.delete(rowKey);
            delete this._unreactiveProp._selectedRows[rowKey];
        }
    }

    /**
     * @description Handles selection/deselection of all rows
     * @param {Event} event - The selection event
     * @returns {void}
     */
    handleAllRowSelection(event) {
        this._unreactiveProp._selectedRows = {};
        this._unreactiveProp._selectedRowsKey = new Set();
        this._unreactiveProp._allRowsSelected = event?.target?.checked;

        for (let i = 0; i < this.visibleData.length; i++) {
            const row = this.visibleData[i];
            row.isSelected = this._unreactiveProp._allRowsSelected;

            let modifiedRow = this._unreactiveProp._modifiedDataCache[row.key];
            if (row.key && modifiedRow) {
                modifiedRow.isSelected = this._unreactiveProp._allRowsSelected;
                if (this._unreactiveProp._allRowsSelected) {
                    this._unreactiveProp._selectedRows[row.key] = modifiedRow;
                    this._unreactiveProp._selectedRowsKey.add(row.key);
                }
            }
        }
    }

    /******************************************Resize Handling : START********************************************/
    /**
     * @description Handles the start of column resizing
     * @param {Event} event - The resize start event - mouse down event
     * @returns {void}
     */
    handleResizeStart(event) {
        // Prevent default to avoid text selection during resize
        event.preventDefault();

        // Get the column header element being resized
        const headerCell = event.currentTarget.parentElement;
        const columnKey = headerCell.dataset.columnkey;
        const initialX = event.clientX;
        const initialWidth = headerCell.offsetWidth;

        // Store initial values for later use during mousemove
        this._unreactiveProp.resizing = {
            columnKey,
            headerCell,
            initialX,
            initialWidth,
            rafId: null
        };

        // Add event listeners for resize tracking
        window.addEventListener('mousemove', this.handleResizeMove.bind(this));
        window.addEventListener('mouseup', this.handleResizeEnd.bind(this));
    }

    /**
     * @description Handles the mouse move event during column resizing
     * @param {Event} event - The mouse move event - mouse move event
     * @returns {void}
     */
    handleResizeMove(event) {
        if (!this._unreactiveProp.resizing) return;

        // Cancel any existing animation frame to avoid multiple updates
        if (this._unreactiveProp.resizing.rafId) {
            window.cancelAnimationFrame(this._unreactiveProp.resizing.rafId);
        }

        // Schedule the resize update on the next animation frame
        this._unreactiveProp.resizing.rafId = window.requestAnimationFrame(() => {
            if (!this._unreactiveProp.resizing) return;

            // Calculate width change based on mouse movement
            const { initialX, initialWidth, headerCell } = this._unreactiveProp.resizing;
            const deltaX = event.clientX - initialX;
            const newWidth = Math.max(80, initialWidth + deltaX); // Min width of 80px

            // Apply new width to the header cell
            headerCell.style.width = `${newWidth}px`;

            // Find and update the corresponding table column width
            const columnKey = this._unreactiveProp.resizing.columnKey;
            const tableHeader = this.template.querySelector(`th[data-columnkey="${columnKey}"]`);
            if (tableHeader) {
                tableHeader.style.width = `${newWidth}px`;
            }

            // Update all rows for this column to maintain alignment
            const tableCells = this.template.querySelectorAll(`td[data-column="${columnKey}"]`);
            tableCells.forEach((cell) => {
                cell.style.width = `${newWidth}px`;
            });
        });
    }

    /**
     * @description Handles the end of column resizing
     * @returns {void}
     */
    handleResizeEnd() {
        // Cancel any pending animation frame
        if (this._unreactiveProp.resizing && this._unreactiveProp.resizing.rafId) {
            window.cancelAnimationFrame(this._unreactiveProp.resizing.rafId);
        }

        // Clean up event listeners when resize is complete
        window.removeEventListener('mousemove', this.handleResizeMove.bind(this));
        window.removeEventListener('mouseup', this.handleResizeEnd.bind(this));

        // Clear the resizing state
        this._unreactiveProp.resizing = null;
    }
    /******************************************Resize Handling : END********************************************/
}
