import { Injectable } from '@nestjs/common';
import { CreateNewLibraryDto } from './dto/create-new-library.dto';
import { UpdateNewLibraryDto } from './dto/update-new-library.dto';

@Injectable()
export class NewLibraryService {
  create(createNewLibraryDto: CreateNewLibraryDto) {
    return 'This action adds a new newLibrary';
  }

  findAll() {
    return `This action returns all newLibrary`;
  }

  findOne(id: number) {
    return `This action returns a #${id} newLibrary`;
  }

  update(id: number, updateNewLibraryDto: UpdateNewLibraryDto) {
    return `This action updates a #${id} newLibrary`;
  }

  remove(id: number) {
    return `This action removes a #${id} newLibrary`;
  }
}
