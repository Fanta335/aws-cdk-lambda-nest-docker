import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cat } from './cat.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CatsService {
  constructor(
    @InjectRepository(Cat)
    private catsRepository: Repository<Cat>,
  ) {}

  findAll() {
    return this.catsRepository.find();
  }

  findById(id: number) {
    return this.catsRepository.findOne({ where: { id: id } });
  }

  async updateCat(id: number, name: string) {
    const catToBeUpdated = await this.findById(id);
    catToBeUpdated.name = name;
    return this.catsRepository.save(catToBeUpdated);
  }

  createCat(name: string) {
    return this.catsRepository.save({ name });
  }
}
