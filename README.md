# Virtual Datatable LWC Component

A high-performance Lightning Web Component (LWC) datatable that efficiently handles large datasets through virtual scrolling. This component overcomes the rendering limitations of the standard lightning-datatable when dealing with massive data volumes.

## Features

- 🚀 Virtual scrolling for efficient rendering of large datasets
- ✨ Support for 500,000+ rows with smooth scrolling
- ✅ Row selection (single/multiple) capability
- 🎯 Support for various data types including:
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

## Installation

Deploy the following components to your Salesforce org:

- virtualTableCell LWC
- virtualTable LWC

## Usage

See usage for `virtualTable` and `virtualTableCell` LWC components in the LWC `virtualTableTest`.

### Public Properties

- `allowRowSelection` - Type : `Boolean` - Controls whether rows can be selected
- `key` - Type : `String` - Unique identifier field for each row
- `columns` - Type : `Array` - Table column definitions in the format of what `lightning-datatable` expects. (See `virtualTableTest` for reference)
- `rowData` - Type : `Array` - Data to be displayed in the table

### Public Methods

- `getSelectedRows` - Returns currently selected rows (if `allowRowSelection` is true), otherwise returns an empty array. If `allowRowSelection` is true, then component will give you a `String` which has value `allRows` if all rows are selected (this is for performance reasons, to avoid sending large data outside of this component), otherwise it will return an `Object` of selected rows keys.

## Limitations

- The component behaviour for accessibility is not yet implemented. (PRs are welcome)
- The component does not support the `lightning-datatable` API. (PRs are welcome)
- The component total row count visibility is dependent on the client's resolution and web browser. For now client/user needs to manually zoom in/out to see the total rows. (WIP and PRs are welcome)
