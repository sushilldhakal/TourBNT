export default function EditUserPage({ params }: { params: { id: string } }) {
    return (
        <div>
            <h1>Edit User: {params.id}</h1>
        </div>
    );
}
