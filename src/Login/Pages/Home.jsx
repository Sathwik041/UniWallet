import { Link } from "react-router-dom";
import { UniWallet } from "../../Wallet/UniWallet";


export const Home=({user,error})=>{
    
    return(
        <div className="bg-black min-h-screen">
            {error && <p className=" text-red-500 mb-4 text-sm text-center pt-4">{error}</p>}
            {user ? (
                <div >
                    <UniWallet user={user} />
                </div>
            ): <div className="min-h-screen flex flex-col justify-center items-center text-2xl font-bold text-white bg-black p-8">
                <div className="text-center border border-white p-8 rounded-lg shadow-lg">
                    <h2>Welcome!</h2>
                    <p>Please login or register to access your UniWallet</p>
                    <div className="mt-5">
                        <Link className="mx-2 hover:underline bg-gray-500 p-2 rounded-md " to="/login">Login</Link>
                        <Link className="mx-2 hover:underline bg-gray-500 p-2 rounded-md " to="/register">Register</Link>
                    </div>
                </div>
                </div>}
        </div>
    );
    
}

