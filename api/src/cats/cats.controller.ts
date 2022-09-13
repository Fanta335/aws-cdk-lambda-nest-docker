import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { CatsService } from './cats.service';

@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Get()
  findAll() {
    return this.catsService.findAll();
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
}
