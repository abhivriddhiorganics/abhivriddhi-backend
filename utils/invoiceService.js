const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Invoice Service — generates professional PDFs using PDFKit.
 * Lightweight, fast, and low-memory. Perfect for Render Free Tier.
 */

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const amount = Math.floor(num);
  if (amount === 0) return 'Zero only';
  
  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    return '';
  };

  const handleBig = (n) => {
    let str = '';
    if (n >= 10000000) {
      str += convert(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += convert(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += convert(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n > 0) {
      str += convert(n);
    }
    return str.trim() + ' only';
  };

  return handleBig(amount);
};

/**
 * Generates the PDF buffer using PDFKit
 */
const generateInvoicePDF = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const orderId = String(order._id).slice(-8).toUpperCase();
      const sa = order.shippingAddress || {};
      const date = new Date(order.createdAt || Date.now()).toLocaleDateString('en-GB');
      const greenTheme = '#1a3d0c';
      const lightGreen = '#f0f7e8';

      // 1. Logo and Header
      const logoPath = path.join(__dirname, 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 40, { height: 50 });
      } else {
        doc.fillColor(greenTheme).fontSize(20).text('Abhivriddhi Organics', 40, 45);
      }

      doc.fillColor(greenTheme).fontSize(14).font('Helvetica-Bold').text('Tax Invoice / Bill of Supply', 300, 45, { align: 'right' });
      doc.fillColor('#666').fontSize(10).font('Helvetica').text('(Original for Recipient)', 300, 62, { align: 'right' });

      doc.moveTo(40, 100).lineTo(555, 100).strokeColor(greenTheme).lineWidth(2).stroke();

      // 2. Address Section
      let top = 120;
      doc.fillColor(greenTheme).fontSize(10).font('Helvetica-Bold').text('Sold By:', 40, top);
      doc.fillColor('#000').font('Helvetica').fontSize(10);
      doc.text('Abhivriddhi Organics Private Limited', 40, top + 15);
      doc.text('102, Green Valley Estate, B-Phase', 40, top + 28);
      doc.text('Indore, MADHYA PRADESH, 452010, IN', 40, top + 41);
      doc.font('Helvetica-Bold').text('PAN No: ', 40, top + 56).font('Helvetica').text('ABCPD1234F', 85, top + 56);
      doc.font('Helvetica-Bold').text('GST No: ', 40, top + 69).font('Helvetica').text('23ABCPD1234F1Z1', 85, top + 69);

      doc.fillColor(greenTheme).font('Helvetica-Bold').text('Billing & Shipping Address:', 300, top, { align: 'right' });
      doc.fillColor('#000').font('Helvetica').text(sa.fullName || 'Customer', 300, top + 15, { align: 'right' });
      doc.text(sa.addressLine || '', 300, top + 28, { align: 'right' });
      doc.text(`${sa.city || ''}, ${sa.state || ''}, ${sa.pincode || ''}, IN`, 300, top + 41, { align: 'right' });
      doc.font('Helvetica-Bold').text('State Code: 23', 300, top + 56, { align: 'right' });

      // 3. Order Highlights Bar
      top = 210;
      doc.rect(40, top, 515, 30).fill(lightGreen).strokeColor('#c2d6b2').lineWidth(0.5).stroke();
      doc.fillColor(greenTheme).font('Helvetica-Bold').fontSize(9);
      doc.text('Order Number:', 50, top + 10);
      doc.fillColor('#000').font('Helvetica').text(orderId, 120, top + 10);
      doc.fillColor(greenTheme).font('Helvetica-Bold').text('Order Date:', 200, top + 10);
      doc.fillColor('#000').font('Helvetica').text(date, 260, top + 10);
      doc.fillColor(greenTheme).font('Helvetica-Bold').text('Invoice No:', 350, top + 10);
      doc.fillColor('#000').font('Helvetica').text(`INV-${orderId}`, 410, top + 10);

      // 4. Table Header
      top = 255;
      doc.rect(40, top, 515, 20).fill(greenTheme);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
      doc.text('Sl.', 45, top + 7, { width: 25 });
      doc.text('Description', 70, top + 7, { width: 180 });
      doc.text('Price', 250, top + 7, { width: 40, align: 'right' });
      doc.text('Qty', 300, top + 7, { width: 30, align: 'center' });
      doc.text('Net Amt', 340, top + 7, { width: 50, align: 'right' });
      doc.text('Tax', 400, top + 7, { width: 60, align: 'right' });
      doc.text('Total', 470, top + 7, { width: 75, align: 'right' });

      // 5. Table Rows
      let currentRow = top + 20;
      const gstRate = 0.05;
      let totalTaxAmount = 0;

      (order.orderItems || []).forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        const netAmt = itemTotal / (1 + gstRate);
        const taxAmt = itemTotal - netAmt;
        totalTaxAmount += taxAmt;

        doc.fillColor('#000').font('Helvetica').fontSize(9);
        doc.text(index + 1, 45, currentRow + 8);
        doc.font('Helvetica-Bold').text(item.name, 70, currentRow + 8, { width: 180 });
        doc.font('Helvetica').fontSize(7).text(`HSN: 15159091`, 70, currentRow + 18, { width: 180 });
        
        doc.fontSize(9);
        doc.text(`₹${(item.price / (1 + gstRate)).toFixed(2)}`, 250, currentRow + 8, { width: 40, align: 'right' });
        doc.text(item.quantity, 300, currentRow + 8, { width: 30, align: 'center' });
        doc.text(`₹${netAmt.toFixed(2)}`, 340, currentRow + 8, { width: 50, align: 'right' });
        doc.text(`₹${taxAmt.toFixed(2)}`, 400, currentRow + 8, { width: 60, align: 'right' });
        doc.text(`₹${itemTotal.toLocaleString('en-IN')}`, 470, currentRow + 8, { width: 75, align: 'right' });

        doc.moveTo(40, currentRow + 32).lineTo(555, currentRow + 32).strokeColor('#eee').lineWidth(0.5).stroke();
        currentRow += 32;

        // Check for page overflow
        if (currentRow > 700) {
          doc.addPage();
          currentRow = 50;
        }
      });

      // 6. Grand Total Row
      doc.rect(40, currentRow, 515, 25).fill('#eee');
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(10);
      doc.text('TOTAL:', 400, currentRow + 8, { width: 60, align: 'right' });
      doc.text(`₹${order.totalAmount.toLocaleString('en-IN')}`, 470, currentRow + 8, { width: 75, align: 'right' });

      // 7. Amount in Words
      currentRow += 40;
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(10).text('Amount in Words:', 40, currentRow);
      doc.font('Helvetica-Oblique').fontSize(9).text(numberToWords(order.totalAmount), 40, currentRow + 15);

      // 8. Signature
      currentRow += 40;
      doc.rect(350, currentRow, 180, 80).strokeColor('#ddd').stroke();
      doc.fillColor('#555').fontSize(8).font('Helvetica').text('For Abhivriddhi Organics Pvt Ltd:', 360, currentRow + 10);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text('Authorized Signatory', 360, currentRow + 60, { width: 160, align: 'center' });

      // 9. Footer
      doc.fontSize(8).fillColor('#888').text('This is an electronically generated invoice. No physical signature is required.', 40, 780, { align: 'center', width: 515 });

      doc.end();
    } catch (error) {
      console.error('❌ [Invoice] PDFKit Critical Error:', error);
      reject(error);
    }
  });
};

// Compatibility wrapper for the dummy/HTML generation if needed
const generateInvoiceHTML = (order) => { return ""; }; 

module.exports = { generateInvoiceHTML, generateInvoicePDF };
