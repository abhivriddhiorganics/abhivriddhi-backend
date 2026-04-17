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

      doc.fillColor(greenTheme).fontSize(14).font('Helvetica-Bold').text('Bill of Supply / Invoice', 300, 45, { align: 'right' });
      doc.fillColor('#666').fontSize(10).font('Helvetica').text('(Original for Recipient)', 300, 62, { align: 'right' });

      doc.moveTo(40, 100).lineTo(555, 100).strokeColor(greenTheme).lineWidth(2).stroke();

      // 2. Address Section
      let top = 120;
      doc.fillColor(greenTheme).fontSize(10).font('Helvetica-Bold').text('Sold By:', 40, top);
      doc.fillColor('#000').font('Helvetica').fontSize(10);
      doc.text('Abhivriddhi Organics Private Limited', 40, top + 15);
      doc.text('Post Mauhar, Near Society Office, ', 40, top + 27);
      doc.text('Near Panchayat Office Tikaitan Tola, ', 40, top + 39);
      doc.text('Kothi Didaundh, Satna,', 40, top + 51);
      doc.text('Madhya Pradesh, 485666', 40, top + 63);
      doc.text('Phone: +91 7999598032', 40, top + 77);
      doc.text('Email: abhivriddhiorganics@gmail.com', 40, top + 89);
      doc.font('Helvetica-Bold').text('GST No: ', 40, top + 104).font('Helvetica').text('23SXNPS8344M1Z7', 85, top + 104);

      doc.fillColor(greenTheme).font('Helvetica-Bold').text('Billing & Shipping Address:', 300, top, { align: 'right' });
      doc.fillColor('#000').font('Helvetica').text(sa.fullName || 'Customer', 300, top + 15, { align: 'right' });
      doc.text(sa.addressLine || '', 300, top + 28, { align: 'right' });
      doc.text(`${sa.city || ''}, ${sa.state || ''}, ${sa.pincode || ''}, IN`, 300, top + 41, { align: 'right' });

      // 3. Order Highlights Bar
      top = 250;
      doc.rect(40, top, 515, 30).fill(lightGreen).strokeColor('#c2d6b2').lineWidth(0.5).stroke();
      doc.fillColor(greenTheme).font('Helvetica-Bold').fontSize(9);
      doc.text('Order Number:', 50, top + 10);
      doc.fillColor('#000').font('Helvetica').text(orderId, 120, top + 10);
      doc.fillColor(greenTheme).font('Helvetica-Bold').text('Transaction ID:', 180, top + 10);
      doc.fillColor('#000').font('Helvetica').text(order.paymentInfo?.id || 'Prepaid', 250, top + 10);
      doc.fillColor(greenTheme).font('Helvetica-Bold').text('Invoice No:', 380, top + 10);
      doc.fillColor('#000').font('Helvetica').text(`INV-${orderId}`, 440, top + 10);

      // 4. Table Header
      top = 295;
      doc.rect(40, top, 515, 20).fill(greenTheme);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
      doc.text('Sl.', 45, top + 7, { width: 25 });
      doc.text('Description', 75, top + 7, { width: 280 });
      doc.text('Price', 365, top + 7, { width: 50, align: 'right' });
      doc.text('Qty', 425, top + 7, { width: 30, align: 'center' });
      doc.text('Total', 465, top + 7, { width: 70, align: 'right' });

      // 5. Table Rows
      let currentRow = top + 20;
      let subtotal = 0;
      (order.orderItems || []).forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        doc.fillColor('#000').font('Helvetica').fontSize(9);
        doc.text(index + 1, 45, currentRow + 8);
        doc.font('Helvetica-Bold').text(item.name, 75, currentRow + 8, { width: 280 });
        doc.font('Helvetica').fontSize(7).text(`PID: ${item.productId} | HSN: 15159091`, 75, currentRow + 18, { width: 280 });
        
        doc.fontSize(9);
        doc.text(`${item.price.toFixed(2)}`, 365, currentRow + 8, { width: 50, align: 'right' });
        doc.text(item.quantity, 425, currentRow + 8, { width: 30, align: 'center' });
        doc.text(`${itemTotal.toLocaleString('en-IN')}`, 465, currentRow + 8, { width: 70, align: 'right' });

        doc.moveTo(40, currentRow + 32).lineTo(555, currentRow + 32).strokeColor('#eee').lineWidth(0.5).stroke();
        currentRow += 32;

        // Check for page overflow
        if (currentRow > 700) {
          doc.addPage();
          currentRow = 50;
        }
      });

      // 6. Grand Total Row
      const shippingFee = order.shippingFee || 0;
      if (shippingFee > 0) {
        doc.rect(40, currentRow, 515, 50).fill('#f9f9f9').strokeColor('#ddd').lineWidth(0.5).stroke();
        doc.fillColor('#000').font('Helvetica-Bold').fontSize(9);
        doc.text('Subtotal:', 380, currentRow + 8, { width: 80, align: 'right' });
        doc.text(`${subtotal.toLocaleString('en-IN')}`, 465, currentRow + 8, { width: 70, align: 'right' });
        
        doc.text('Shipping:', 380, currentRow + 20, { width: 80, align: 'right' });
        doc.text(`${shippingFee.toLocaleString('en-IN')}`, 465, currentRow + 20, { width: 70, align: 'right' });
        
        doc.fontSize(10).text('TOTAL:', 380, currentRow + 34, { width: 80, align: 'right' });
        doc.text(`Rs. ${order.totalAmount.toLocaleString('en-IN')}`, 465, currentRow + 34, { width: 70, align: 'right' });
        currentRow += 60;
      } else {
        doc.rect(40, currentRow, 515, 25).fill('#eee');
        doc.fillColor('#000').font('Helvetica-Bold').fontSize(10);
        doc.text('TOTAL:', 380, currentRow + 8, { width: 80, align: 'right' });
        doc.text(`Rs. ${order.totalAmount.toLocaleString('en-IN')}`, 465, currentRow + 8, { width: 70, align: 'right' });
        currentRow += 35;
      }

      // 7. Amount in Words
      currentRow += 40;
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(10).text('Amount in Words:', 40, currentRow);
      doc.font('Helvetica-Oblique').fontSize(9).text(numberToWords(order.totalAmount), 40, currentRow + 15);


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
