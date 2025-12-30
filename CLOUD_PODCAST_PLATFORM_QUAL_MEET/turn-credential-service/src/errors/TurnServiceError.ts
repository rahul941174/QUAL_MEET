export class TurnServiceError extends Error{
    public readonly statusCode:number;
    public readonly code:string;

    constructor(code:string,statusCode:number,message?:string){
        super(message || code);
        this.code=code;
        this.statusCode=statusCode;

        //Required for instanceof to work correctly
        Object.setPrototypeOf(this,TurnServiceError.prototype);
    }
}