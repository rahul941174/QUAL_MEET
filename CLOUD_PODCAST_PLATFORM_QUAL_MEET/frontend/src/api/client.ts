const API_BASE_URL=import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

let authToken:string | null =null;


//setting jwt token
export function setAuthToken(token:string){
    authToken=token;
    localStorage.setItem("auth_token", token);
}

//clear jwt token
export function clearAuthToken(){
    authToken=null;
    localStorage.removeItem("auth_token");
}


interface RequestOptions extends RequestInit{
    auth?:boolean;
}

export async function apiRequest<T>(
    path:string,
    options:RequestOptions={}
):Promise<T>{
    
    const headers:Record<string, string>={
        "Content-Type":"application/json",
    };

    if(options.headers){
        if(options.headers instanceof Headers){
             // Convert Headers → object
            options.headers.forEach((value,key)=>{
                headers[key]=value;
            });
        }
        else if(Array.isArray(options.headers)){
            // Convert array → object
            for(const [key,value] of options.headers){
                headers[key]=value;
            }
        }
        else{
            // Already object → merge
            Object.assign(headers,options.headers);
        }
    }

    if(options.auth && authToken){
        headers["Authorization"]=`Bearer ${authToken}`;
    }

    const res=await fetch(`${API_BASE_URL}${path}`,{
        ...options,
        headers
    });

    if(!res.ok){
        const errorBody=await res.json().catch(()=>({}));
        throw new Error(errorBody.error || "API request failed");
    }

    return res.json() as Promise<T>;

}


// ===========to be removed later when token is set in cookie=======/
export function initAuthToken() {
  const token = localStorage.getItem("auth_token");
  if (token) {
    authToken = token;
  }
}
