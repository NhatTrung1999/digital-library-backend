import { Injectable } from '@nestjs/common';
import { CreateHighAbrasionDto } from './dto/create-high-abrasion.dto';
import { UpdateHighAbrasionDto } from './dto/update-high-abrasion.dto';

@Injectable()
export class HighAbrasionService {
  create(createHighAbrasionDto: CreateHighAbrasionDto) {
    return 'This action adds a new highAbrasion';
  }

  findAll() {
    return `This action returns all highAbrasion`;
  }

  findOne(id: number) {
    return `This action returns a #${id} highAbrasion`;
  }

  update(id: number, updateHighAbrasionDto: UpdateHighAbrasionDto) {
    return `This action updates a #${id} highAbrasion`;
  }

  remove(id: number) {
    return `This action removes a #${id} highAbrasion`;
  }
}
