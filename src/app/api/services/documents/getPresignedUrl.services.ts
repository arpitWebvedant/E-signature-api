import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { Document, DocumentData, User } from '../../models'
import * as JSZip from 'jszip'
import path from 'path'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import moment from "moment";
import libre from 'libreoffice-convert'
import { promisify } from 'util'

const libreConvertAsync = promisify(libre.convert)

const parseColorToRGB = (color: string) => {
  // Handle hex colors like #1521CB
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16) / 255
    const g = parseInt(hex.substring(2, 4), 16) / 255
    const b = parseInt(hex.substring(4, 6), 16) / 255
    return rgb(r, g, b)
  }
  // Default to black if color format is not recognized
  return rgb(0, 0, 0)
}

const isDataUrl = (v: unknown): v is string =>
  typeof v === 'string' && /^data:.*;base64,/.test(v)

const stripDataUrl = (v: string) => v.replace(/^data:.*;base64,/, '')

const toUint8 = (v: unknown): Uint8Array => {
  if (v instanceof Uint8Array) return v

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v))
    return v as Uint8Array
  if (v instanceof ArrayBuffer) return new Uint8Array(v)
  if (typeof v === 'string') {
    const b64 = isDataUrl(v) ? stripDataUrl(v) : v
    return Uint8Array.from(Buffer.from(b64, 'base64'))
  }

  return Uint8Array.from(Buffer.from(String(v ?? ''), 'base64'))
}

const convertDocxBytesToPdf = async (docxBytes: Uint8Array): Promise<Uint8Array> => {
  try {
    const inputBuffer = Buffer.isBuffer(docxBytes) ? docxBytes : Buffer.from(docxBytes)
    const pdfBuffer = await libreConvertAsync(inputBuffer, '.pdf', undefined)
    
    return new Uint8Array(pdfBuffer)
  } catch (error) {
    console.error('❌ DOCX to PDF conversion failed:', error)
    throw new Error(`Failed to convert DOCX to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const detectFileType = (result: any, key: string): 'pdf' | 'docx' => {
  const t = (result?.fileType || result?.mimeType || '').toLowerCase()
  if (t.includes('pdf')) return 'pdf'
  if (
    t.includes('word') ||
    t.includes('officedocument.wordprocessingml.document') ||
    t.includes('docx')
  )
    return 'docx'

  if (key?.toLowerCase().endsWith('.pdf')) return 'pdf'
  return 'docx'
}
const remToPt = (rem: number, base = 15) => rem * base * 0.75
// Helper function to convert coordinates based on field index
const calculatePDFPosition = (
  field: any,
  pageWidth: number,
  pageHeight: number,
  fieldIndex: number,
) => {
  console.log(`\n=== Processing Field ${fieldIndex + 1} ===`)
  console.log('Original field data:', {
    id: field.id,
    type: field.type,
    pageX: field.pageX,
    pageY: field.pageY,
    width: field.width,
    height: field.height,
    pageNumber: field.pageNumber,
  })

  let x, y, width, height

  // Method 1: Direct coordinate mapping
  x = field.pageX
  y = field.pageY
  width = field.width
  height = field.height

  // Convert percentage to actual coordinates if needed
  if (
    typeof x === 'number' &&
    typeof y === 'number' &&
    typeof width === 'number' &&
    typeof height === 'number'
  ) {
    if (x <= 100 && y <= 100 && width <= 100 && height <= 100) {
      x = (x / 100) * pageWidth
      y = (y / 100) * pageHeight
      width = (width / 100) * pageWidth
      height = (height / 100) * pageHeight
    }
  } else {
    x = Number(x) || 0
    y = Number(y) || 0
    width = Number(width) || 50
    height = Number(height) || 20
  }

  // Convert from top-left origin (UI) to bottom-left origin (PDF)
  const finalY = pageHeight - y - height

  console.log('Calculated position:', {
    pageSize: { pageWidth, pageHeight },
    calculated: { x, y: finalY, width, height },
  })

  return {
    x: Math.max(0, x),
    y: Math.max(0, finalY),
    width: Math.max(1, width),
    height: Math.max(1, height),
  }
}

const multipleSignersFields = (currentUser: any, step2: any, email: string) => {
  if (!currentUser || !Array.isArray(step2?.fields)) return []

  return step2.fields
    .map((field: any) => {
      // Clone field so we don’t mutate original
      const cloned = { ...field }

      // 2️⃣ Handle signature array → keep only currentUser’s signature
      if (Array.isArray(field.signature)) {
        const signature = field.signature.find(
          (s: any) => s.email === email
        )
        cloned.signature = signature
      }

      // 3️⃣ Handle customText array → keep only currentUser’s text
      if (Array.isArray(field.customText)) {

        const customText = field.customText.find(
          (t: any) => t.email === email
        )
        cloned.customText = customText?.text ? customText?.text : ''
      }

      return cloned
    })
    .filter(Boolean) // remove nulls
}

// Helper function to get signer color
const getSignerColor = (signers: any[], signerEmail: string) => {
  const signer = signers.find(s => s.email === signerEmail);
  return signer?.color ? parseColorToRGB(signer.color) : rgb(0, 0, 0);
};

const fieldHandlers: Record<
  string,
  (args: {
    field: any
    page: any
    position: { x: number; y: number; width: number; height: number }
    pdfDoc: any
    helvetica: any
    embeddedSignatures: Map<string, any>
    documentSignData: any
  }) => Promise<void>
> = {
  NAME: async ({ field, page, position, helvetica }) => {
    const nameText = field.customText || field.recipient?.name || ''
    console.log(`✏️ Adding NAME field: "${nameText}"`)

    // console.log("Field from name: ", field)

    const textColor = field.recipient?.color
      ? parseColorToRGB(field.recipient.color)
      : rgb(0, 0, 0)

    page.drawText(nameText, {
      x: position.x,
      y: position.y + position.height / 2,
      size: 12,
      font: helvetica,
      color: textColor
    })
  },

  DATE: async ({ field, page, position, helvetica }) => {
    const dateText = field.customText || new Date().toLocaleDateString('en-GB')
    console.log('📅 Adding DATE field')
    page.drawText(dateText, {
      x: position.x,
      y: position.y + position.height / 2,
      size: 12,
      font: helvetica,
    })
  },

  SIGNATURE: async ({
    field,
    page,
    position,
    pdfDoc,
    helvetica,
    embeddedSignatures,
    documentSignData,
  }) => {
    if (
      !(
        field?.signature?.signatureImageAsBase64 ||
        documentSignData?.signature ||
        field?.signature?.typedSignature
      )
    ) {
      return
    }

    console.log('🖋️ Adding SIGNATURE field')

    const signatureBase64 =
      field?.signature?.signatureImageAsBase64 || documentSignData?.signature || null
    const signatureText = field?.signature?.typedSignature || null

    if (signatureText) {
      // Handwritten font
      const fontPath = path.resolve(
        './public/fonts/Caveat/Caveat-VariableFont_wght.ttf'
      )
      try {
        const fontBytes = await fs.readFileSync(fontPath)
        const customFont = await pdfDoc.embedFont(fontBytes)
        page.drawText(signatureText, {
          x: position.x,
          y: position.y + position.height / 2,
          size: field?.signature?.fontSize
            ? remToPt(parseFloat(String(field.signature.fontSize)))
            : 12,
          maxWidth: position.width,
          font: customFont,
        })
      } catch {
        console.warn('⚠️ Custom font failed, using Helvetica')
        page.drawText(signatureText, {
          x: position.x,
          y: position.y + position.height / 2,
          size: 12,
          maxWidth: position.width,
          font: helvetica,
        })
      }
    } else if (signatureBase64) {
      let signatureImage = embeddedSignatures.get(signatureBase64)
      if (!signatureImage) {
        const sigBytes = toUint8(signatureBase64)
        try {
          signatureImage = await pdfDoc.embedPng(sigBytes)
        } catch {
          signatureImage = await pdfDoc.embedJpg(sigBytes)
        }
        embeddedSignatures.set(signatureBase64, signatureImage)
      }

      page.drawImage(signatureImage, {
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
      })
    }
  },
}

export const convertToLocalSystemFormat = (
  customText: string | null,
  dateFormat: string | null = "MM/DD/YYYY",
): string => {
  const coalescedDateFormat = dateFormat ?? "MM/DD/YYYY";

  const input =
    typeof customText === "string" && customText.trim()
      ? customText.trim()
      : null;

  // Parse the input without specifying a format (moment will auto-detect ISO)
  const parsedDate = input ? moment(input) : moment();

  console.log("Input Date String:", input);
  console.log("Parsed Date:", parsedDate.toString());
  console.log("Is Valid Date:", parsedDate.isValid());

  if (!parsedDate.isValid()) {
    return moment().format(coalescedDateFormat); // fallback with proper format
  }

  // Format the parsed date to the desired format
  return parsedDate.format(coalescedDateFormat);
};

export const getPresignedUrlService = async (
  data: any,
  options?: { signerEmail?: string },
  forEmail?: boolean,
) => {
  try {
    const currentUser = await User.findOne({ where: { id: data.userId } });
    if (!currentUser) return null;

    const result = await DocumentData.findOne({ where: { data: data.key } });
    if (!result) return null;

    const document = await Document.findOne({ where: { id: data.documentId } });
    const documentSignData: any = document?.documentSignData;
    if (!documentSignData) return null;

    const step0 = documentSignData?.['0']?.data ?? {};
    const step1 = documentSignData?.['1']?.data ?? {};
    const step2 = documentSignData?.['2']?.data ?? {};

    const signers = Array.isArray(step1?.signers) ? step1.signers : [];
    const allFields: any[] = Array.isArray(step2?.fields) ? step2.fields : [];
    const fileType = detectFileType(result, data?.key);
    const dateFormat = step0?.data?.meta?.dateFormat || 'MM/DD/YYYY';

    // 🔎 NEW: Filter only fields for the specified signer and/or type
    const signerEmail = options?.signerEmail || data?.email || '';
    const filteredFields = allFields.filter((field) => {
      const matchesSigner =
        !signerEmail || field.signerEmail === signerEmail;
      return matchesSigner;
    });
    let fields: any[] = allFields
    if (forEmail) {
      fields = filteredFields
    }
    // if(isMultipleSigners){
    //   fields = multipleSignersFields(currentUser, step2)
    // }
    // =====================
    // =======  PDF  =======
    // =====================
    if (fileType === 'pdf') {
      console.log('\n🔧 Starting PDF processing...')
      // Create new pdf for each signer
      console.log(`\n--- Processing for signer: ${signerEmail} ---`)
      const initialPdfBytes = toUint8(result.initialData)
      const pdfDoc = await PDFDocument.load(initialPdfBytes)
      pdfDoc.registerFontkit(fontkit)

      // Pre-embed common fonts once
      const helvetica = await pdfDoc.embedStandardFont(StandardFonts.Helvetica)
      const helveticaBold = await pdfDoc.embedStandardFont(
        StandardFonts.HelveticaBold,
      )

      // Cache for base64->embedded image
      const embeddedSignatures = new Map<string, any>()

      // Keep the first encountered SIGNATURE field to replicate on certificate page
      let firstSignatureField: any | null = null

      if (fields.length) {
        console.log(`\n📝 Found ${fields.length} fields to process`);

        // Stable sort by page, then Y, then X
        const sortedFields = fields.slice().sort((a: any, b: any) => {
          const pageA = a.pageNumber ?? 1;
          const pageB = b.pageNumber ?? 1;
          if (pageA !== pageB) return pageA - pageB;
          const yA = a.pageY ?? 0;
          const yB = b.pageY ?? 0;
          if (Math.abs(yA - yB) > 0.0001) return yA - yB;
          return (a.pageX ?? 0) - (b.pageX ?? 0);
        });

        for (let i = 0; i < sortedFields.length; i++) {
          const field = sortedFields[i];
          const pageIndex = Math.max(0, (field.pageNumber ?? 1) - 1);
          const page = pdfDoc.getPages()[pageIndex];
          if (!page) {
            console.warn(
              `⚠️ Page ${pageIndex + 1} not found for field ${field.id}`,
            );
            continue;
          }

          const { width: pageWidth, height: pageHeight } = page.getSize();
          const position = calculatePDFPosition(field, pageWidth, pageHeight, i);

          // Get signer color for all fields
          const textColor = getSignerColor(signers, field.signerEmail);

          // Define a function to handle drawing text
          // const drawText = (text: string, fontToUse: any, fontSize: number, maxWidth?: number) => {
          //   page.drawText(text || "", {
          //     x: position.x,
          //     y: position.y + position.height / 2,
          //     size: fontSize,
          //     font: fontToUse,
          //     maxWidth: maxWidth,
          //   });
          // };
          console.log("::::Check Field Type:::::", field.type);
          // Handle drawing based on field type

          console.log("Harsh Test How many times called:::::");

          // Define a function to handle drawing text
          const drawText = (text: string, fontToUse: any, fontSize: number, maxWidth?: number, textColor?: any) => {
            page.drawText(text || "", {
              x: position.x,
              y: position.y + position.height / 2,
              size: fontSize,
              font: fontToUse,
              maxWidth: maxWidth,
              color: textColor
            });
          };
          // Handle drawing based on field type
          switch (field.type) {
            case 'NAME': {
              console.log("::::Drawing NAME Field:::::");
              console.log("field.customText:", field.customText);
              let nameText = '';
              for (const text of field.customText) {
                if (text.email === field.signerEmail) {
                  nameText = text.text || '';
                  break;
                }
              }
              console.log(`✏️ Adding NAME field: "${nameText}"`);
              // console.log("From method show field: ", field)

              // console.log("For signer color: ", textColor)
              drawText(nameText, helvetica, 12, undefined, textColor);
              break;
            }
            case 'DATE': {
              let dateText = '';
              for (const text of field.customText) {
                if (text.email === field.signerEmail) {
                  dateText = text.text;
                  break;
                }
              }
              drawText(dateText, helvetica, 12, undefined, textColor);
              break;
            }
            case 'DATE': {
              let dateText = '';
              for (const text of field.customText) {
                if (text.email === field.signerEmail) {
                  dateText = text.text;
                  break;
                }
              }
              console.log("dateText before format:", dateText);
              console.log("dateFormat:", dateFormat);
              let formateDate = convertToLocalSystemFormat(dateText, dateFormat);
              console.log("formateDate:", formateDate);
              console.log('📅 Adding DATE field');
              drawText(formateDate, helvetica, 12, undefined, textColor);
              break;
            }
            case 'SIGNATURE': {
              if (!firstSignatureField) firstSignatureField = field;
              let signatureImageAsBase64 = '';
              let typedSignature = '';
              if (field.signature && Array.isArray(field.signature)) {
                for (const item of field.signature) {
                  if (item.email === field.signerEmail) {
                    signatureImageAsBase64 = item.signatureImageAsBase64 || '';
                    typedSignature = item.typedSignature || '';
                    break;
                  }
                }
              } else {
                signatureImageAsBase64 = field.signature?.signatureImageAsBase64 || '';
                typedSignature = field.signature?.typedSignature || '';
              }

              if (signatureImageAsBase64 || documentSignData?.signature || typedSignature) {
                console.log('🖋️ Adding SIGNATURE field');

                const signatureBase64 = signatureImageAsBase64 || documentSignData?.signature || null;
                const signatureText = typedSignature || null;
                console.log("signatureBase64:", signatureBase64);
                console.log("signatureText:", signatureText);
                if (signatureText) {
                  const fontPath = path.resolve('./public/fonts/Caveat/Caveat-VariableFont_wght.ttf');
                  try {
                    const fontBytes = await fs.readFileSync(fontPath);
                    const customFont = await pdfDoc.embedFont(fontBytes);
                    const fontSize = field?.signature?.fontSize ? remToPt(parseFloat(String(field.signature.fontSize))) : 12;
                    // drawText(signatureText, customFont, fontSize, position.width);
                    page.drawText(signatureText, {
                      x: position.x,
                      y: position.y + position.height / 2,
                      size: fontSize,
                      maxWidth: position.width,
                      font: customFont,
                      color: textColor
                    });
                  } catch (e) {
                    console.warn('⚠️ Failed to load custom signature font, falling back to Helvetica');
                    // drawText(signatureText, helvetica, 12, position.width);
                    page.drawText(signatureText, {
                      x: position.x,
                      y: position.y + position.height / 2,
                      size: 12,
                      maxWidth: position.width,
                      font: helvetica,
                      color: textColor
                    });
                  }
                } else if (signatureBase64) {
                  let signatureImage = embeddedSignatures.get(signatureBase64);
                  if (!signatureImage) {
                    const sigBytes = toUint8(signatureBase64);
                    try {
                      signatureImage = await pdfDoc.embedPng(sigBytes);
                    } catch {
                      try {
                        signatureImage = await pdfDoc.embedJpg(sigBytes);
                      } catch (error) {
                        console.error(`❌ Failed to embed signature for field ${field.id}:`, error);
                        continue;
                      }
                    }
                    embeddedSignatures.set(signatureBase64, signatureImage);
                  }
                  page.drawImage(signatureImage, {
                    x: position.x,
                    y: position.y,
                    width: position.width,
                    height: position.height,
                  });

                  // Add colored border around image signature to identify signer
                  // page.drawRectangle({
                  //     x: position.x - 1,
                  //     y: position.y - 1,
                  //     width: position.width + 2,
                  //     height: position.height + 2,
                  //     borderColor: textColor,
                  //     borderWidth: 1,
                  // });
                }
              }
              break;
            }
            // Add a default case for handling any other types or a "default text" field
            default: {
              let nameText = '';
              for (const text of field.customText) {
                if (text.email === field.signerEmail) {
                  nameText = text.text || '';
                  break;
                }
              }
              console.log(`✏️ Adding OTHER field: "${nameText}"`);
              // drawText(nameText, helvetica, 12);
              page.drawText(nameText, {
                x: position.x,
                y: position.y + position.height / 2,
                size: 12,
                font: helvetica,
                color: textColor
              });
              break;
            }
          }
        }
      }

      // ✅ Append Signing Certificate page
      try {
        const certificatePath = path.resolve('./public/Certificate2.pdf')
        if (fs.existsSync(certificatePath)) {
          const certificateBytes = fs.readFileSync(certificatePath)
          const certificatePdf = await PDFDocument.load(certificateBytes)

          const step1 = documentSignData['1']?.data
          const signedSigners = (step1?.signers || []).filter((s: any) => s?.status === 'SIGNED')

          // Helper to resolve the correct signature for a signer
          const resolveSignatureForEmail = (signerEmail: string) => {
            let imageBase64: string | null = null
            let typed: string | null = null
            for (const f of fields) {
              if (f.type !== 'SIGNATURE') continue
              if (Array.isArray(f.signature)) {
                const found = f.signature.find((i: any) => i.email === signerEmail)
                if (found) {
                  imageBase64 = found.signatureImageAsBase64 || null
                  typed = found.typedSignature || null
                  break
                }
              } else if (f.signerEmail === signerEmail) {
                imageBase64 = f.signature?.signatureImageAsBase64 || null
                typed = f.signature?.typedSignature || null
                break
              }
            }
            if (!imageBase64 && !typed && firstSignatureField?.type === 'SIGNATURE') {
              imageBase64 = firstSignatureField?.signature?.signatureImageAsBase64 || documentSignData?.signature || null
              typed = firstSignatureField?.signature?.typedSignature || null
            }
            return { imageBase64, typed }
          }

          for (const signer of signedSigners) {
            const [certificatePage] = await pdfDoc.copyPages(certificatePdf, [0])
            pdfDoc.addPage(certificatePage)

            const newPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1]
            const { width, height } = newPage.getSize()

            let marginLeft = 25
            const textColor = rgb(0.4, 0.4, 0.4)
            let cursorY = height - 140

            // Signer Name
            if (signer?.name) {
              newPage.drawText(String(signer.name), {
                x: marginLeft,
                y: cursorY,
                size: 9,
                font: await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold),
                color: textColor,
              })
            }

            // Signer Email
            cursorY -= 60
            if (signer?.email) {
              newPage.drawText(String(signer.email), {
                x: marginLeft,
                y: cursorY,
                size: 9,
                font: await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold),
                color: textColor,
              })
            }

            // Signature inside bounded box
            const innerPadding = 2
            const boxWidth = 140
            const boxHeight = 55
            const relativeOffsetX = 120
            const relativeOffsetY = 20
            const boxX = marginLeft + relativeOffsetX
            const boxY = cursorY + relativeOffsetY

            const { imageBase64, typed } = resolveSignatureForEmail(String(signer?.email || ''))
            if (typed) {
              const fontPath = path.resolve('./public/fonts/Caveat/Caveat-VariableFont_wght.ttf')
              const fontBytes = fs.readFileSync(fontPath)
              const customFont = await pdfDoc.embedFont(fontBytes)
              let size = 24
              const minSize = 8
              const maxTextWidth = boxWidth - innerPadding * 2
              const maxTextHeight = boxHeight - innerPadding * 2
              while (size > minSize) {
                const tW = customFont.widthOfTextAtSize(typed, size)
                const tH = customFont.heightAtSize(size)
                if (tW <= maxTextWidth && tH <= maxTextHeight) break
                size -= 1
              }
              const tW = customFont.widthOfTextAtSize(typed, size)
              const tH = customFont.heightAtSize(size)
              const drawX = boxX + innerPadding + (maxTextWidth - tW) / 2
              const drawY = boxY + innerPadding + (maxTextHeight - tH) / 2
              newPage.drawText(typed, { x: drawX, y: drawY, size, font: customFont, color: textColor })
            } else if (imageBase64) {
              let signatureImage = embeddedSignatures.get(imageBase64)
              if (!signatureImage) {
                const sigBytes = toUint8(imageBase64)
                try { signatureImage = await pdfDoc.embedPng(sigBytes) } catch { signatureImage = await pdfDoc.embedJpg(sigBytes) }
                embeddedSignatures.set(imageBase64, signatureImage)
              }
              if (signatureImage) {
                const origW = signatureImage.width
                const origH = signatureImage.height
                const maxW = boxWidth - innerPadding * 2
                const maxH = boxHeight - innerPadding * 2
                const scale = Math.min(maxW / origW, maxH / origH)
                const drawW = Math.max(0, origW * scale)
                const drawH = Math.max(0, origH * scale)
                const drawX = boxX + innerPadding + (maxW - drawW) / 2
                const drawY = boxY + innerPadding + (maxH - drawH) / 2
                newPage.drawImage(signatureImage, { x: drawX, y: drawY, width: drawW, height: drawH })
              }
            }

            // Document ID
            marginLeft += 200
            newPage.drawText(String(data?.documentId) || '', {
              x: marginLeft,
              y: 658,
              size: 9,
              font: await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold),
              color: textColor,
            })

            // Details column (right aligned values)
            const tableTopY = 712
            const detailsRightX = Math.min(width - 72, 1008) // 4px further left
            const detailsYStart = tableTopY // 3px further up
            const detailsLineGap = 15
            const boldFont = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold)
            const sentVal = new Date().toISOString() || ''
            const viewedVal = new Date().toISOString() || ''
            const signedVal = new Date().toISOString() || ''
            const reasonVal = 'text here'
            const sentW = boldFont.widthOfTextAtSize(sentVal, 9)
            const viewedW = boldFont.widthOfTextAtSize(viewedVal, 9)
            const signedW = boldFont.widthOfTextAtSize(signedVal, 9)
            const reasonW = boldFont.widthOfTextAtSize(reasonVal, 9)
            newPage.drawText(sentVal, { x: detailsRightX - sentW, y: detailsYStart, size: 9, font: boldFont, color: textColor })
            newPage.drawText(viewedVal, { x: detailsRightX - viewedW, y: detailsYStart - detailsLineGap, size: 9, font: boldFont, color: textColor })
            newPage.drawText(signedVal, { x: detailsRightX - signedW, y: detailsYStart - detailsLineGap * 2, size: 9, font: boldFont, color: textColor })
            newPage.drawText(reasonVal, { x: detailsRightX - reasonW, y: detailsYStart - detailsLineGap * 3, size: 9, font: boldFont, color: textColor })
          }
        } else {
          console.warn('⚠️ Certificate2.pdf not found in ./public/')
        }
      } catch (err) {
        //push
        console.error('❌ Failed to append Signing Certificate page:', err)
      }
      const pdfBytes = await pdfDoc.save()
      return pdfBytes
    }
    // =====================
    // ======= DOCX ========
    // =====================
    try {
      const initialDocxBytes = toUint8(result.initialData)
      const zip = await JSZip.loadAsync(Buffer.from(initialDocxBytes))

      let documentXml = (await zip.file('word/document.xml')?.async('string')) || null
      if (!documentXml) throw new Error('Could not find document.xml in DOCX file')

      if (!fields.length) {
        const finalDocxNoChange = await zip.generateAsync({
          type: 'arraybuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        })
        return convertDocxBytesToPdf(new Uint8Array(finalDocxNoChange))
      }

      console.log('\n🔧 Starting DOCX processing...')
      console.log(`📝 Found ${fields.length} fields to process`)

      const hasPlaceholders = fields.some((f) => !!f.placeholder)

      // Ensure r namespace exists
      if (!/xmlns:r=/.test(documentXml)) {
        documentXml = documentXml.replace(
          /<w:document([^>]*)>/,
          (m, g1) =>
            `<w:document${g1} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`,
        )
      }

      // Common relationship file
      let relsXml = (await zip.file('word/_rels/document.xml.rels')?.async('string')) ||
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'

      const existingIds = Array.from(relsXml.matchAll(/Id="rId(\d+)"/g)).map(
        (m) => parseInt(m[1], 10),
      )
      let nextRelId = Math.max(0, ...(existingIds.length ? existingIds : [0])) + 1

      const mediaFiles = new Map<string, Uint8Array>()

      if (hasPlaceholders) {
        console.log('🔄 Using placeholder replacement mode')

        let newRelationships = ''

        for (const field of fields) {
          const placeholder: string | undefined = field.placeholder
          if (!placeholder) continue

          if (field.type === 'NAME' || field.type === 'INITIALS' || field.type === 'EMAIL') {
            let fieldText = ''
            if (Array.isArray(field.customText)) {
              for (const text of field.customText) {
                if (text.email === field.signerEmail) {
                  fieldText = text.text || ''
                  break
                }
              }
            } else {
              fieldText = field.customText || field.recipient?.name || ''
            }

            const textPattern = new RegExp(
              `(<w:t[^>]*>)([^<]*${escapeRegex(placeholder)}[^<]*)(<\/w:t>)`,
              'gi',
            )
            documentXml = documentXml.replace(
              textPattern,
              (match, openTag, content, closeTag) => {
                const newContent = content.replace(
                  new RegExp(escapeRegex(placeholder), 'gi'),
                  escapeXml(fieldText),
                )
                return openTag + newContent + closeTag
              },
            )
          } else if (field.type === 'DATE') {
            let dateText = ''
            if (Array.isArray(field.customText)) {
              for (const text of field.customText) {
                if (text.email === field.signerEmail) {
                  dateText = text.text || ''
                  break
                }
              }
            } else {
              dateText = field.customText || new Date().toLocaleDateString('en-GB')
            }

            const formattedDate = convertToLocalSystemFormat(dateText, dateFormat)

            const textPattern = new RegExp(
              `(<w:t[^>]*>)([^<]*${escapeRegex(placeholder)}[^<]*)(<\/w:t>)`,
              'gi',
            )
            documentXml = documentXml.replace(
              textPattern,
              (match, openTag, content, closeTag) => {
                const newContent = content.replace(
                  new RegExp(escapeRegex(placeholder), 'gi'),
                  escapeXml(formattedDate),
                )
                return openTag + newContent + closeTag
              },
            )
          } else if (field.type === 'SIGNATURE') {
            // Handle array-based signature for multiple signers
            let signatureImageAsBase64 = ''
            let typedSignature = ''

            if (field.signature && Array.isArray(field.signature)) {
              for (const item of field.signature) {
                if (item.email === field.signerEmail) {
                  signatureImageAsBase64 = item.signatureImageAsBase64 || ''
                  typedSignature = item.typedSignature || ''
                  break
                }
              }
            } else if (field.signature) {
              signatureImageAsBase64 = field.signature?.signatureImageAsBase64 || ''
              typedSignature = field.signature?.typedSignature || ''
            }

            if (signatureImageAsBase64) {
              const sigBytes = toUint8(signatureImageAsBase64)
              const isPng = sigBytes[0] === 0x89 && sigBytes[1] === 0x50 && sigBytes[2] === 0x4e
              const ext = isPng ? 'png' : 'jpg'
              const mediaFileName = `image${nextRelId}.${ext}`
              mediaFiles.set(mediaFileName, sigBytes)
              newRelationships += `\n  <Relationship Id="rId${nextRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaFileName}"/>`

              const imageElement = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="1440000" cy="720000"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${nextRelId}" name="Signature ${nextRelId}"/><wp:cNvGraphicFramePr/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name=""/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${nextRelId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1440000" cy="720000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`

              const textPattern = new RegExp(
                `(<w:t[^>]*>)([^<]*${escapeRegex(placeholder)}[^<]*)(<\/w:t>)`,
                'gi',
              )
              documentXml = documentXml.replace(
                textPattern,
                (match, openTag, content, closeTag) => {
                  if (content.trim() === placeholder) {
                    return `</w:r>${imageElement}<w:r><w:t></w:t>`
                  } else {
                    const idx = content.indexOf(placeholder)
                    const before = content.substring(0, idx)
                    const after = content.substring(idx + placeholder.length)
                    let replacement = openTag + before + closeTag
                    replacement += `</w:r>${imageElement}<w:r>`
                    replacement += openTag + after + closeTag
                    return replacement
                  }
                },
              )

              nextRelId++
            } else if (typedSignature) {
              const textPattern = new RegExp(
                `(<w:t[^>]*>)([^<]*${escapeRegex(placeholder)}[^<]*)(<\/w:t>)`,
                'gi',
              )
              documentXml = documentXml.replace(
                textPattern,
                (match, openTag, content, closeTag) => {
                  const newContent = content.replace(
                    new RegExp(escapeRegex(placeholder), 'gi'),
                    escapeXml(typedSignature),
                  )
                  return openTag + newContent + closeTag
                },
              )
            }
          } else {
            let fieldText = ''
            if (Array.isArray(field.customText)) {
              for (const text of field.customText) {
                if (text.email === field.signerEmail) {
                  fieldText = text.text || ''
                  break
                }
              }
            } else {
              fieldText = field.customText || field.recipient?.name || ''
            }

            const textPattern = new RegExp(
              `(<w:t[^>]*>)([^<]*${escapeRegex(placeholder)}[^<]*)(<\/w:t>)`,
              'gi',
            )
            documentXml = documentXml.replace(
              textPattern,
              (match, openTag, content, closeTag) => {
                const newContent = content.replace(
                  new RegExp(escapeRegex(placeholder), 'gi'),
                  escapeXml(fieldText),
                )
                return openTag + newContent + closeTag
              },
            )
          }
        }

        // Merge new relationships and media
        if (newRelationships) {
          const endIdx = relsXml.lastIndexOf('</Relationships>')
          relsXml = endIdx !== -1
            ? relsXml.slice(0, endIdx) + newRelationships + '\n' + relsXml.slice(endIdx)
            : relsXml
        }

        for (const [fileName, buffer] of mediaFiles)
          zip.file(`word/media/${fileName}`, Buffer.from(buffer))
        zip.file('word/document.xml', documentXml)
        zip.file('word/_rels/document.xml.rels', relsXml)
      } else {
        // Positioning mode with anchored shapes
        console.log('📍 Using positioning mode with anchored shapes')

        let newRelationships = ''
        const pageWidthEmu = 7772400
        const pageHeightEmu = 10058400
        let positionedContent = ''

        // Group by page for stable ordering
        const fieldsByPage = new Map<number, any[]>()
        for (const f of fields) {
          const pageNum = f.pageNumber ?? 1
          if (!fieldsByPage.has(pageNum)) fieldsByPage.set(pageNum, [])
          fieldsByPage.get(pageNum)!.push(f)
        }

        for (const [, pageFields] of fieldsByPage) {
          pageFields.sort((a, b) => {
            const yDiff = (a.pageY ?? 0) - (b.pageY ?? 0)
            if (Math.abs(yDiff) < 5) return (a.pageX ?? 0) - (b.pageX ?? 0)
            return yDiff
          })
        }

        for (const [, pageFields] of fieldsByPage) {
          for (const field of pageFields) {
            const widthPct = Math.max(1, field.width ?? 20)
            const heightPct = Math.max(1, field.height ?? 10)


            const textColor = getSignerColor(signers, field.signerEmail)
            const hexColor = rgbToHex(textColor)

            // Calculate position in EMU
            const posX = Math.round(((field.pageX ?? 0) / 100) * pageWidthEmu)
            const posY = Math.round(((field.pageY ?? 0) / 100) * pageHeightEmu)
            const widthEmu = Math.max(200000, Math.round((widthPct / 100) * pageWidthEmu))
            const heightEmu = Math.max(100000, Math.round((heightPct / 100) * pageHeightEmu))

            // console.log(`📍 ${field.type} at (${posX}, ${posY}) with color ${hexColor}`)

            if (field.type === 'NAME' || field.type === 'INITIALS' || field.type === 'EMAIL') {
              let fieldText = ''
              if (Array.isArray(field.customText)) {
                for (const text of field.customText) {
                  if (text.email === field.signerEmail) {
                    fieldText = text.text || ''
                    break
                  }
                }
              } else {
                fieldText = field.customText || field.recipient?.name || ''
              }

              positionedContent += createAnchoredTextBox(nextRelId, field.type, fieldText, posX, posY, widthEmu, heightEmu, hexColor)
              nextRelId++
            } else if (field.type === 'DATE') {
              let dateText = ''
              if (Array.isArray(field.customText)) {
                for (const text of field.customText) {
                  if (text.email === field.signerEmail) {
                    dateText = text.text || ''
                    break
                  }
                }
              } else {
                dateText = field.customText || new Date().toLocaleDateString('en-GB')
              }

              const formattedDate = convertToLocalSystemFormat(dateText, dateFormat)
              positionedContent += createAnchoredTextBox(nextRelId, 'DATE', formattedDate, posX, posY, widthEmu, heightEmu, hexColor)
              nextRelId++
            } else if (field.type === 'SIGNATURE') {
              let signatureImageAsBase64 = ''
              let typedSignature = ''

              if (field.signature && Array.isArray(field.signature)) {
                for (const item of field.signature) {
                  if (item.email === field.signerEmail) {
                    signatureImageAsBase64 = item.signatureImageAsBase64 || ''
                    typedSignature = item.typedSignature || ''
                    break
                  }
                }
              } else if (field.signature) {
                signatureImageAsBase64 = field.signature?.signatureImageAsBase64 || ''
                typedSignature = field.signature?.typedSignature || ''
              }

              if (signatureImageAsBase64) {
                const sigBytes = toUint8(signatureImageAsBase64)
                const isPng = sigBytes[0] === 0x89 && sigBytes[1] === 0x50 && sigBytes[2] === 0x4e
                const ext = isPng ? 'png' : 'jpg'
                const mediaFileName = `image${nextRelId}.${ext}`
                mediaFiles.set(mediaFileName, sigBytes)
                newRelationships += `\n  <Relationship Id="rId${nextRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaFileName}"/>`

                positionedContent += createAnchoredImage(nextRelId, posX, posY, widthEmu, heightEmu)
                nextRelId++
              } else if (typedSignature) {
                positionedContent += createAnchoredTextBox(nextRelId, 'SIGNATURE', typedSignature, posX, posY, widthEmu, heightEmu, hexColor)
                nextRelId++
              }
            } else {
              let fieldText = ''
              if (Array.isArray(field.customText)) {
                for (const text of field.customText) {
                  if (text.email === field.signerEmail) {
                    fieldText = text.text || ''
                    break
                  }
                }
              } else {
                fieldText = field.customText || field.recipient?.name || ''
              }

              positionedContent += createAnchoredTextBox(nextRelId, field.type, fieldText, posX, posY, widthEmu, heightEmu, hexColor)
              nextRelId++
            }
          }
        }

        // Insert positioned content at the beginning of the body
        if (positionedContent) {
          const bodyStart = documentXml.indexOf('<w:body>')
          if (bodyStart !== -1) {
            const bodyEnd = documentXml.indexOf('>', bodyStart)
            if (bodyEnd !== -1) {
              const insertPosition = bodyEnd + 1
              documentXml = documentXml.substring(0, insertPosition) + positionedContent + documentXml.substring(insertPosition)
            }
          }
        }

        if (newRelationships) {
          const relationshipsEndIndex = relsXml.lastIndexOf('</Relationships>')
          if (relationshipsEndIndex !== -1) {
            relsXml = relsXml.slice(0, relationshipsEndIndex) + newRelationships + '\n' + relsXml.slice(relationshipsEndIndex)
          }
        }

        for (const [fileName, buffer] of mediaFiles)
          zip.file(`word/media/${fileName}`, Buffer.from(buffer))
        zip.file('word/document.xml', documentXml)
        zip.file('word/_rels/document.xml.rels', relsXml)
      }

      const finalDocx = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      })
      return convertDocxBytesToPdf(new Uint8Array(finalDocx))
    } catch (error) {
      console.error('DOCX processing failed:', error)
      throw error
    }
  } catch (error) {
    console.error('Presigned url fetch failed:', error)
    return null
  }
}

// small helper to escape XML special chars in inserted text
function escapeXml(unsafe: string) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Helper to escape regex special characters
function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Helper functions for creating properly anchored elements

function createAnchoredTextBox(relId: number, fieldType: string, text: string, x: number, y: number, width: number, height: number, color: string): string {
  const escapedText = escapeXml(text)
  const fieldName = `${fieldType}_${relId}`


  return `<w:p><w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="1" layoutInCell="1" allowOverlap="1">
<wp:simplePos x="0" y="0"/>
<wp:positionH relativeFrom="page"><wp:posOffset>${x}</wp:posOffset></wp:positionH>
<wp:positionV relativeFrom="page"><wp:posOffset>${y}</wp:posOffset></wp:positionV>
<wp:extent cx="${width}" cy="${height}"/>
<wp:effectExtent l="0" t="0" r="0" b="0"/>
<wp:wrapNone/>
<wp:docPr id="${relId}" name="${fieldName}"/>
<wp:cNvGraphicFramePr/>
<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
    <wps:wsp xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
      <wps:cNvSpPr/>
      <wps:spPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="${width}" cy="${height}"/>
        </a:xfrm>
        <a:prstGeom prst="rect">
          <a:avLst/>
        </a:prstGeom>
        <a:noFill/>
        <a:ln w="0">
          <a:solidFill>
            <a:srgbClr val="FFFFFF"/>
          </a:solidFill>
        </a:ln>
      </wps:spPr>
      <wps:txbx>
        <w:txbxContent>
          <w:p>
            <w:pPr>
              <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
              <w:jc w:val="left"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:color w:val="${color}"/>
                <w:sz w:val="24"/>
              </w:rPr>
              <w:t>${escapedText}</w:t>
            </w:r>
          </w:p>
        </w:txbxContent>
      </wps:txbx>
      <wps:bodyPr vertOverflow="clip" horzOverflow="clip" wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t" anchorCtr="0"/>
    </wps:wsp>
  </a:graphicData>
</a:graphic>
</wp:anchor></w:drawing></w:r></w:p>`
}

function createAnchoredImage(relId: number, x: number, y: number, width: number, height: number): string {
  return `<w:p><w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="1" layoutInCell="1" allowOverlap="1">
<wp:simplePos x="0" y="0"/>
<wp:positionH relativeFrom="page"><wp:posOffset>${x}</wp:posOffset></wp:positionH>
<wp:positionV relativeFrom="page"><wp:posOffset>${y}</wp:posOffset></wp:positionV>
<wp:extent cx="${width}" cy="${height}"/>
<wp:effectExtent l="0" t="0" r="0" b="0"/>
<wp:wrapNone/>
<wp:docPr id="${relId}" name="Signature_${relId}"/>
<wp:cNvGraphicFramePr/>
<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
    <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
      <pic:nvPicPr>
        <pic:cNvPr id="0" name=""/>
        <pic:cNvPicPr/>
      </pic:nvPicPr>
      <pic:blipFill>
        <a:blip r:embed="rId${relId}"/>
        <a:stretch>
          <a:fillRect/>
        </a:stretch>
      </pic:blipFill>
      <pic:spPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="${width}" cy="${height}"/>
        </a:xfrm>
        <a:prstGeom prst="rect">
          <a:avLst/>
        </a:prstGeom>
      </pic:spPr>
    </pic:pic>
  </a:graphicData>
</a:graphic>
</wp:anchor></w:drawing></w:r></w:p>`
}

// Correctly convert RGB object to hex
function rgbToHex(rgbColor: any): string {
  if (!rgbColor || typeof rgbColor !== 'object') {
    return '000000'
  }

  try {
    // pdf-lib rgb() returns an object with red, green, blue properties (0-1 range)
    const r = Math.round((rgbColor.red ?? rgbColor.r ?? 0) * 255)
    const g = Math.round((rgbColor.green ?? rgbColor.g ?? 0) * 255)
    const b = Math.round((rgbColor.blue ?? rgbColor.b ?? 0) * 255)

    return (
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0')
    ).toUpperCase()
  } catch (error) {
    console.error('Error converting RGB to hex:', error, rgbColor)
    return '000000'
  }
}