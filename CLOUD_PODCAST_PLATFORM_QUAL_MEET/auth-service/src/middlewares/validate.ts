import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

export function validate(schema: ZodType<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    // replace body with validated data
    req.body = result.data;
    next();
  };
}










// //validate sign up request body
// export function validateSignup(req:Request,res:Response,next:NextFunction){
//     const {email,password,fullName}=req.body;

//     if(!email || typeof email !== "string"){
//         return res.status(400).json(
//             {
//                 error:"Invalid Email",
//             }
//         )
//     }

//     if(!password || typeof password!== "string" || password.length<8){
//         return res.status(400).json({
//             error:"Password must be at least 8 characters",
//         })
//     }

//     if(!fullName || typeof fullName!== "string"){
//         return res.status(400).json(
//             {
//                 error:"Invalid Full Name",
//             }
//         )
//     }
//     next();
// }

// //validate login request body
// export function validateLogin(req:Request,res:Response,next:NextFunction){
//     const {email,password}=req.body;

//     if(!email || typeof email!=="string"){
//         return res.status(400).json(
//             {
//                 error:"Invalid email",
//             }
//         )
//     }
    
//     if(!password || typeof password !== "string"){
//         return res.status(400).json(
//             {
//                 error:"Invalid password",
//             }
//         )
//     }

//     next();
// }