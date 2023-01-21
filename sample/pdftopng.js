const pdfium = require('../dist/pdfium.js');
const { readFile } = require('node:fs/promises');
const Jimp = require('jimp');

const BYTES_PER_PIXEL = 4;

const FPDF_ERR = {
    SUCCESS: 0,    // No error.
    UNKNOWN: 1,    // Unknown error.
    FILE: 2,       // File not found or could not be opened.
    FORMAT: 3,     // File not in PDF format or corrupted.
    PASSWORD: 4,   // Password required or incorrect password.
    SECURITY: 5,   // Unsupported security scheme.
    PAGE: 6,       // Page not found or content error.
};

const FPDFBitmap = {
    Unknown: 0,
    Gray: 1,    // Gray scale bitmap, one byte per pixel.
    BGR: 2,     // 3 bytes per pixel, byte order: blue, green, red.
    BGRx: 3,    // 4 bytes per pixel, byte order: blue, green, red, unused.
    BGRA: 4     // 4 bytes per pixel, byte order: blue, green, red, alpha.
};

// Page rendering flags. They can be combined with bit-wise OR.
const FPDF = {
    // Set if annotations are to be rendered.
    ANNOT: 0x01,
    // Set if using text rendering optimized for LCD display. This flag will only
    // take effect if anti-aliasing is enabled for text.
    LCD_TEXT: 0x02,
    // Don't use the native text output available on some platforms
    NO_NATIVETEXT: 0x04,
    // Grayscale output.
    GRAYSCALE: 0x08,
    // Obsolete, has no effect, retained for compatibility.
    DEBUG_INFO: 0x80,
    // Obsolete, has no effect, retained for compatibility.
    NO_CATCH: 0x100,
    // Limit image cache size.
    RENDER_LIMITEDIMAGECACHE: 0x200,
    // Always use halftone for image stretching.
    RENDER_FORCEHALFTONE: 0x400,
    // Render for printing.
    PRINTING: 0x800,
    // Set to disable anti-aliasing on text. This flag will also disable LCD
    // optimization for text rendering.
    RENDER_NO_SMOOTHTEXT: 0x1000,
    // Set to disable anti-aliasing on images.
    RENDER_NO_SMOOTHIMAGE: 0x2000,
    // Set to disable anti-aliasing on paths.
    RENDER_NO_SMOOTHPATH: 0x4000,
    // Set whether to render in a reverse Byte order, this flag is only used when
    // rendering to a bitmap.
    REVERSE_BYTE_ORDER: 0x10,
    // Set whether fill paths need to be stroked. This flag is only used when
    // FPDF_COLORSCHEME is passed in, since with a single fill color for paths the
    // boundaries of adjacent fill paths are less visible.
    CONVERT_FILL_TO_STROKE: 0x20,
};

class FPdfLibrary {
    static async init() {
        const module = await pdfium();
        module._FPDF_InitLibraryWithConfig({
            version: 2,
            m_pIsolate: null,
            m_pUserFontPaths: null,
            m_v8EmbedderSlot: 0,
            m_pPlatform: null
        });
        return new FPdfLibrary(module);
    }

    constructor(module) {
        this.module = module;
    }

    async loadDocument(path, password = '') {
        const buff = await readFile(path);
        const size = buff.length;

        const ptr = this.module._malloc(size);
        this.module.HEAPU8.set(buff, ptr);

        const document = this.module._FPDF_LoadMemDocument(ptr, size, password);
        const lastError = this.module._FPDF_GetLastError();
        if (lastError != FPDF_ERR.SUCCESS) {
            throw new Error(`PDFファイルの読み込みに失敗しました。 : error = ${lastError}`);
        }

        return new FPdfDocument(this.module, ptr, document);
    }

    destroy() {
        this.module._FPDF_DestroyLibrary();
    }
}

class FPdfDocument {
    constructor(module, documentPointer, documentHandle) {
        this.module = module;
        this.documentPointer = documentPointer;
        this.documentHandle = documentHandle;
    }

    getPageCount() {
        return this.module._FPDF_GetPageCount(this.documentHandle);
    }

    renderPage(i) {
        const page = this.module._FPDF_LoadPage(this.documentHandle, i);
        const width = Math.floor(this.module._FPDF_GetPageWidth(page));
        const height = Math.floor(this.module._FPDF_GetPageHeight(page));

        const buffSize = width * height * BYTES_PER_PIXEL;
        const ptr = this.module._malloc(buffSize);
        this.module.HEAPU8.fill(0, ptr, ptr + buffSize);

        const bitmap = this.module._FPDFBitmap_CreateEx(width, height, FPDFBitmap.BGRA, ptr, width * BYTES_PER_PIXEL);
        this.module._FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0xFFFFFFFF);
        this.module._FPDF_RenderPageBitmap(bitmap, page, 0, 0, width, height, 0, FPDF.REVERSE_BYTE_ORDER | FPDF.ANNOT | FPDF.LCD_TEXT);
        this.module._FPDFBitmap_Destroy(bitmap);
        this.module._FPDF_ClosePage(page);

        const data = Buffer.from(this.module.HEAPU8.subarray(ptr, ptr + buffSize));
        this.module._free(ptr);

        return {
            width: width,
            height: height,
            data: data
        };
    }

    destroy() {
        this.module._FPDF_CloseDocument(this.documentHandle);
        this.module._free(this.documentPointer);
    }
}

(async () => {
    const library = await FPdfLibrary.init();

    const document = await library.loadDocument('sample.pdf');
    const numOfPages = document.getPageCount();
    for (let i = 0; i < numOfPages; i++) {
        console.log(`${(i+1)}ページ目を変換します`)
        const image = document.renderPage(i);

        const jimp = await Jimp.create(image);
        jimp.colorType(2);
        await jimp.writeAsync(`page${i+1}.png`);
    }

    document.destroy();
    library.destroy();
})();
