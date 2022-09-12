import { Controller, Get, Post, Patch } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @Get('foo')
  foo() {
    return {
      message: 'foo',
    };
  }

  @Post('foo/bar')
  bar() {
    return {
      message: 'bar',
    };
  }

  @Patch('foo/bar/baz')
  baz() {
    return {
      message: 'baz',
    };
  }
}
