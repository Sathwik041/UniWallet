import useToastStore from "../../store/toaststore";

export default function Toast() {
    const { visible, message } = useToastStore();

    if (!visible) return null;

    return (
        <div className="fixed top-5 left-160 flex justify-center items-center px-2 py-3 text-white bg-green-600 rounded-lg shadow-lg">
            <span className="text-sm font-medium">{message}</span>
        </div>
    );
}