import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, QueryFailedError, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  findAll(businessId: string, search?: string): Promise<Customer[]> {
    if (!search) {
      return this.customerRepository.find({
        where: { businessId },
        order: { name: 'ASC' },
      });
    }
    return this.customerRepository.find({
      where: [
        { businessId, name: ILike(`%${search}%`) },
        { businessId, phone: ILike(`%${search}%`) },
      ],
      order: { name: 'ASC' },
    });
  }

  async findOne(businessId: string, id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOneBy({
      id,
      businessId,
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  create(businessId: string, dto: CreateCustomerDto): Promise<Customer> {
    return this.customerRepository.save(
      this.customerRepository.create({ ...dto, businessId }),
    );
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<Customer> {
    await this.findOne(businessId, id);
    await this.customerRepository.update({ id, businessId }, dto);
    return this.findOne(businessId, id);
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.findOne(businessId, id);
    try {
      await this.customerRepository.delete({ id, businessId });
    } catch (err) {
      if (err instanceof QueryFailedError && (err.driverError as { code?: string })?.code === '23503') {
        throw new ConflictException(
          'Cannot delete a customer with existing proposals',
        );
      }
      throw err;
    }
  }
}
