import { LightningElement, track } from 'lwc';

export default class VirtualTableTest extends LightningElement {
    isLoading = true;
    allowRowSelection = true;

    @track rowData = [];
    @track columns = [];
    
    // For lightning-datatable sorting functionality
    sortedBy;
    sortedDirection;
    
    // For tracking selected rows in lightning-datatable
    selectedRows = [];

    loadingProgress = 0;

    async connectedCallback() {
        this.addEventListener('processbatches', this.handleProcessBatches.bind(this));
        await this.generateRowData();
        this.generateColumns();
        this.isLoading = false;
        this.loadingProgress = 100;
    }

    /**
     * @param {CustomEvent} event
     */
    handleProcessBatches(event) {
        this.loadingProgress = event?.detail?.progress;
    }

    async generateRowData() {
        const BATCH_SIZE = 1000;

        // const TOTAL_ROWS = 500000;
        const TOTAL_ROWS = 100;

        const generateRow = (index) => ({
            id: 'key' + index,
            name: `Task ${index}`,
            date: new Date(2024, 0, index + 1).toISOString(),
            amount: Math.round(Math.random() * 10000) / 100,
            status: Math.random() > 0.5 ? 'Active' : 'Inactive',
            progress: Math.floor(Math.random() * 100),
            url: `https://example.com/task/${index}`,
            email: `user${index}@example.com`,
            phone: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`
        });

        this.rowData = [];

        await this.processBatches({
            totalItems: TOTAL_ROWS,
            batchSize: BATCH_SIZE,
            processBatch: ({ start, end }) => {
                for (let i = start; i < end; i++) {
                    this.rowData.push(generateRow(i));
                }
            }
        });
    }

    /**
     * Processes a large number of items in smaller batches to avoid UI freezing.
     * This method breaks down a large operation into smaller chunks and processes them asynchronously,
     * allowing the UI to remain responsive during heavy data processing.
     *
     * @param {Object} options - Configuration options for batch processing
     * @param {number} options.totalItems - The total number of items to process
     * @param {number} options.batchSize - The number of items to process in each batch
     * @param {Function} options.processBatch - Function to execute for each batch
     *                                         Receives an object with {start, end, total} indexes
     * @param {Function} [options.onComplete=()=>{}] - Optional callback function to execute when all batches are processed
     * @param {string} [options.loopName='processBatches'] - Optional name identifier for the batch process
     *
     * @returns {Promise<void>} A promise that resolves when all batches have been processed
     *
     * @fires CustomEvent#processbatches - Dispatches an event with progress information after each batch
     *        The event detail contains {progress, loopName} where progress is a percentage (0-100)
     */
    processBatches({ totalItems, batchSize, processBatch, onComplete = () => {}, loopName = 'processBatches' }) {
        return new Promise((resolve) => {
            let currentIndex = 0;

            const processNextBatch = () => {
                const end = Math.min(currentIndex + batchSize, totalItems);
                const batchIndexes = {
                    start: currentIndex,
                    end: end,
                    total: totalItems
                };

                processBatch(batchIndexes);
                currentIndex = end;

                const progressPercentage = Math.round((currentIndex / totalItems) * 100);
                this.dispatchEvent(
                    new CustomEvent('processbatches', {
                        detail: {
                            progress: progressPercentage,
                            loopName: loopName
                        }
                    })
                );

                if (currentIndex < totalItems) {
                    // eslint-disable-next-line @lwc/lwc/no-async-operation
                    setTimeout(processNextBatch, 0);
                } else {
                    onComplete();
                    resolve();
                }
            };

            processNextBatch();
        });
    }

    generateColumns() {
        let columns = [
            { fieldName: 'name', label: 'Task Name', type: 'text' },
            {
                fieldName: 'date',
                label: 'Due Date',
                type: 'date',
                typeAttributes: {
                    year: 'numeric',
                    month: 'long',
                    day: '2-digit'
                }
            },
            {
                fieldName: 'amount',
                label: 'Budget',
                type: 'currency',
                typeAttributes: {
                    currencyCode: 'USD',
                    minimumFractionDigits: 2
                }
            },
            { fieldName: 'status', label: 'Status', type: 'text' },
            { fieldName: 'progress', label: 'Progress', type: 'percent' },
            { fieldName: 'isSelected', label: 'Selected', type: 'boolean' },
            {
                fieldName: 'url',
                label: 'Link',
                type: 'url',
                typeAttributes: {
                    label: { fieldName: 'name' },
                    target: '_blank'
                }
            },
            { fieldName: 'email', label: 'Email', type: 'email' },
            { fieldName: 'phone', label: 'Phone', type: 'phone' }
        ];
        this.columns = columns;
    }

    selectedRowsKey = ['key1', 'key2', 'key3', 'key4', 'key5', 'key6', 'key7', 'key8', 'key9', 'key10'];

    handleGetSelectedRowsButtonClick() {
        /**
         * @type {Set}
         */
        let selectedRowsKeys = this.refs.virtualTableRef?.getSelectedRowsKeys();

        console.log(
            JSON.stringify(selectedRowsKeys, (key, value) => {
                if (value instanceof Set) {
                    return [...value];
                }
                return value;
            })
        );
    }
    
    // Handle sorting in the lightning-datatable
    handleSort(event) {
        this.sortedBy = event.detail.fieldName;
        this.sortedDirection = event.detail.sortDirection;
        
        this.sortData(this.sortedBy, this.sortedDirection);
    }
    
    // Sort the data based on field and direction
    sortData(fieldName, direction) {
        const cloneData = [...this.rowData];
        
        cloneData.sort((a, b) => {
            const valueA = a[fieldName] || '';
            const valueB = b[fieldName] || '';
            
            return direction === 'asc' ? 
                this.sortBy(valueA, valueB) : 
                this.sortBy(valueB, valueA);
        });
        
        this.rowData = cloneData;
    }
    
    sortBy(a, b) {
        // Return -1, 0, or 1 based on string comparison
        return a > b ? 1 : (a < b ? -1 : 0);
    }
    
    // Handle row selection in the lightning-datatable
    handleRowSelection(event) {
        this.selectedRows = event.detail.selectedRows;
        console.log('Selected rows:', this.selectedRows);
    }
}
