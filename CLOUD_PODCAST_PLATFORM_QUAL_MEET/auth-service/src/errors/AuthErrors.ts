import { AppError } from "./AppError";

export class UserAlreadyExistsError extends AppError{
    constructor(){
        super("Userwith this email already exists",409);
    }
}