import Link from '~src/components/link';
import styles from './styles/footer.module.scss';

const links = [
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Blog' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact' },
    { href: '/privacy-policy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms' },
];

export const Footer = () => {
    return (
        <footer className={styles.footer}>
            <nav>
                <ul className={styles.links}>
                    {links.map(({ href, label }) => (
                        <li key={href}>
                            <Link href={href} className={styles.link}>
                                {label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </footer>
    );
};
