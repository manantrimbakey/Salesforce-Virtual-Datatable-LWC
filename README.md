# Virtual Datatable LWC Component

A high-performance Lightning Web Component (LWC) datatable that efficiently handles large datasets through virtual scrolling. This component overcomes the rendering limitations of the standard lightning-datatable when dealing with massive data volumes.

## Features

- 🚀 Virtual scrolling for efficient rendering of large datasets
- ✨ Support for 500,000+ rows with smooth scrolling
- ✅ Row selection (single/multiple) capability
- 🎯 Supports various data types including:
  - Text
  - Number
  - Currency
  - Percent
  - Date
  - DateTime
  - Boolean/Checkbox
  - URL
  - Email
  - Phone
- 🔄 Dynamic column configuration
- 📱 Responsive design
- ⚡ Optimized performance through row virtualization

## Preview

![Virtual Table](./assets/intro.gif)

## Installation

Deploy the following components to your Salesforce org:

- `virtualTableCell` LWC
- `virtualTable` LWC

## Usage

Refer to the `virtualTableTest` LWC component for implementation examples of both `virtualTable` and `virtualTableCell`.

### Public Properties

- `label` - Type: `String` - Label for the table
- `allowRowSelection` - Type: `Boolean` - Controls whether rows can be selected
- `keyField` - Type: `String` - Unique identifier field for each row
- `columns` - Type: `Array` - Table column definitions following the `lightning-datatable` format (See `virtualTableTest` for reference)
- `rowData` - Type: `Array` - Data to be displayed in the table

### Public Methods

- `getSelectedRowsKeys` - Retrieves the keys of currently selected rows if `allowRowSelection` is enabled; otherwise, it returns an empty array. If all rows are selected, it returns a `String` value of `'allRows'`, or a `Set` containing the keys of the selected rows.
**Note:** This method does not return keys when the "select all rows" checkbox is checked, to maintain optimal performance.

## Limitations

- Accessibility features are not yet implemented (PRs welcome)
- The component does not support the `lightning-datatable` API (PRs welcome)
- Total row count visibility depends on the client's resolution and web browser. Users may need to manually zoom in/out to view the total row count (Work in Progress - PRs welcome)
