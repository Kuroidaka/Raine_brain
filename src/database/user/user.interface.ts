export interface userServiceProps {
    id?: string;
    display_name?: string;
    username: string;
    password: string;
    role_id?: string;
}

export interface userUpdateProps {
    display_name?: string;
    password?: string;
    role_id?: string;
    gmail?: string | null, 
    googleCredentials?: string | null,
    eventListId?: string | null
}