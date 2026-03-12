import {create} from "zustand";

const useToastStore=create((set)=>({
    visible: false,
    message: " ",

    showToast:(msg="Copied To Clipboard")=>{
        set({visible:true,message:msg});

        setTimeout(()=>{
            set({visible:false,message:" "});
        },2000);
    }
}));
export default useToastStore;