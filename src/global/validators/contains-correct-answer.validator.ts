import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CreateAnswerDto } from '../../quiz/dto/create-answer.dto';

@ValidatorConstraint({ name: 'containsCorrectAnswer', async: false })
export class ContainsCorrectAnswer implements ValidatorConstraintInterface {
  validate(answerOptions: CreateAnswerDto[], args: ValidationArguments) {
    return answerOptions.some(answer => answer.isCorrect);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Each question must have at least one correct answer.';
  }
}
