# jCalc - JavaScript Calculation Library

jCalc (based on jAutoCalc) is a lightweight JavaScript library for performing automatic calculations based on input values in a web page. This library is designed to replace the functionality of a jQuery-based script, providing a modern and dependency-free alternative.

## Features

- Automatic calculations based on input values.
- Support for various mathematical functions (sum, average, min, max, count, etc.).
- Customizable formatting options for result display.
- Smart handling of integers and decimals.
- Easy integration into your web page.

## Usage

1. Include the jCalc script in your HTML file:

   ```html
   <script src="path/to/jCalc.js"></script>

2. Add the jCalc attribute to the HTML elements where you want automatic calculations:
   
   ```html
   <input type="text" name="field1" jCalc="sum({field2} * 2)">
   <input type="text" name="field2">

3. Initialize jCalc in your JavaScript:
   
  ```html
   document.addEventListener('DOMContentLoaded', function () {
     document.querySelector('body').jCalc();
   });
