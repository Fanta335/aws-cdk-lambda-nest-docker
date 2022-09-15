import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { CatsService } from './cats.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Get()
  findAll() {
    return this.catsService.findAll();
  }

  @Get('sayhello')
  sayName(@Query('name') name: string) {
    return { message: `Hello ${name}!!` };
  }

  @Get(':id')
  callName(@Param('id') id: string) {
    return this.catsService.findById(Number(id));
  }

  @Post()
  createCat(@Body() createCatDTO: { name: string }) {
    return this.catsService.createCat(createCatDTO.name);
  }

  @Patch(':id')
  updateCat(@Param('id') id: string, @Body() updateCatDTO: { name: string }) {
    return this.catsService.updateCat(Number(id), updateCatDTO.name);
  }

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  addAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.catsService.addAvatar(Number(id), file);
  }
}
