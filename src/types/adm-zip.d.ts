declare module "adm-zip" {
  export default class AdmZip {
    constructor(path?: string | Buffer);
    addFile(entryName: string, content: Buffer): void;
    addLocalFile(path: string, zipPath?: string, zipName?: string): void;
    addLocalFolder(path: string, zipPath?: string): void;
    extractAllTo(targetPath: string, overwrite?: boolean): void;
    writeZip(targetPath: string): void;
    toBuffer(): Buffer;
    getEntries(): Array<{ entryName: string; getData(): Buffer }>;
    getEntry(entryName: string): { entryName: string; getData(): Buffer } | null;
  }
}
