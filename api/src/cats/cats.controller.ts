import { Controller, Get, Post, Body } from '@nestjs/common';
import { CatsService } from './cats.service';

@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Get()
  findAll() {
    return this.catsService.findAll();
  }

  @Post()
  createCat(@Body() createCatDTO: { name: string }) {
    return this.catsService.createCat(createCatDTO.name);
  }
}
