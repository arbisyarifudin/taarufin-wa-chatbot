# Taarufin chatbot auto responder

## Tables

### settings
- id PK
- key
- value

### blocks
- id PK
- type [message, buttons, question]
- text
- next_id NULLABLE PK
- is_start_point BOOLEAN
- input
- match_rules JSON

### block_images
- id PK
- block_id PK
- type [local, url]
- image

### block_options
- id PK
- block_id FK
- text
- next_id PK

### users
- id PK
- name
- wa_chat_id 
- wa_number
- wa_info JSON
- last_block_id PK
- last_block_at

### user_datas (additional fields)
- id PK
- key
- value