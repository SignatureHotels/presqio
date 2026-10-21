import { Global, Module } from "@nestjs/common";
import { PhotoStorageService } from "./photo-storage.service";

@Global()
@Module({ providers: [PhotoStorageService], exports: [PhotoStorageService] })
export class StorageModule {}
