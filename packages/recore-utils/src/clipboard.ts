function getDataFromPasteEvent(event: ClipboardEvent) {
  const clipboardData = event.clipboardData;
  if (!clipboardData) {
    return null;
  }

  try {
    return JSON.parse(clipboardData.getData('text/plain'));
  } catch (error) {
    /*
    const html = clipboardData.getData('text/html');
    if (html !== '') {
      // TODO: clear the html
      return {
        code: '<div dangerouslySetInnerHTML={ __html: html } />',
        maps: {},
      };
    }
    */
    // paste the text by div
    return {
      code: clipboardData.getData('text/plain'),
      maps: {},
    };
  }
}

class Clipboard {
  private copyPasters: HTMLTextAreaElement[] = [];
  private waitFn?: (data: any, e: ClipboardEvent) => void;

  isCopyPasteEvent(e: Event) {
    this.isCopyPaster(e.target);
  }

  isCopyPaster(el: any) {
    return this.copyPasters.includes(el);
  }

  initCopyPaster(el: HTMLTextAreaElement) {
    this.copyPasters.push(el);
    const onPaste = (e: ClipboardEvent) => {
      if (this.waitFn) {
        this.waitFn(getDataFromPasteEvent(e), e);
        this.waitFn = undefined;
      }
      el.blur();
    };
    el.addEventListener('paste', onPaste, false);
    return () => {
      el.removeEventListener('paste', onPaste, false);
      const i = this.copyPasters.indexOf(el);
      if (i > -1) {
        this.copyPasters.splice(i, 1);
      }
    };
  }

  injectCopyPaster(document: Document) {
    const copyPaster = document.createElement<"textarea">('textarea');
    copyPaster.style.cssText = "position: relative;left: -9999px;";
    document.body.appendChild(copyPaster);
    const dispose = this.initCopyPaster(copyPaster);
    return () => {
      dispose();
      document.removeChild(copyPaster);
    }
  }

  setData(data: any) {
    const copyPaster = this.copyPasters.find(x => x.ownerDocument);
    if (!copyPaster) {
      return;
    }
    copyPaster.value = typeof data === 'string' ? data : JSON.stringify(data);
    copyPaster.select();
    copyPaster.ownerDocument!.execCommand('copy');

    copyPaster.blur();
  }

  waitPasteData(e: KeyboardEvent, cb: (data: any, e: ClipboardEvent) => void) {
    const win = e.view;
    if (!win) {
      return;
    }
    const copyPaster = this.copyPasters.find(cp => cp.ownerDocument === win.document);
    if (copyPaster) {
      copyPaster.select();
      this.waitFn = cb;
    }
  }
}


export default new Clipboard();
